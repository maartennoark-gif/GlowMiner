// GlowMiner backend (Rust): Miner-Registry, Spawning, Benchmark, Downloads,
// Exchange-Rotation, Config. Kein OC/UV — nur Intensity-Parameter.
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

// ---------------- Miner-Registry ----------------
struct MinerMeta {
    label: &'static str,
    exe_rel: &'static str,
    repo: &'static str,
    supports: &'static [&'static str],
    note: &'static str,
}

fn miners() -> Vec<(&'static str, MinerMeta)> {
    vec![
        ("bzminer", MinerMeta {
            label: "BzMiner (alle Coins)", exe_rel: "bzminer/bzminer.exe",
            repo: "bzminer/bzminer", supports: &["xna", "clore", "dynex", "xelis"],
            note: "KawPow + Dynex + Xelis auf AMD und NVIDIA. Intensity-Regler wird unterstützt.",
        }),
        ("teamredminer", MinerMeta {
            label: "TeamRedMiner (AMD KawPow)", exe_rel: "teamredminer/teamredminer.exe",
            repo: "todxx/teamredminer", supports: &["xna", "clore"],
            note: "Stark auf AMD KawPow. Kein Dynex.",
        }),
        ("srbminer", MinerMeta {
            label: "SRBMiner-Multi (Allround)", exe_rel: "srbminer/SRBMiner-MULTI.exe",
            repo: "doktor83/SRBMiner-Multi", supports: &["xna", "clore", "xelis"],
            note: "KawPow + XelisHashV3 auf AMD und NVIDIA. Kein DynexSolve.",
        }),
        ("wildrig", MinerMeta {
            label: "WildRig-Multi (Alt)", exe_rel: "wildrig/wildrig.exe",
            repo: "andru-kun/wildrig-multi", supports: &["xna", "clore"],
            note: "KawPow-Fallback.",
        }),
        ("onezerominer", MinerMeta {
            label: "OneZeroMiner (Dynex/Xelis)", exe_rel: "onezerominer/onezerominer.exe",
            repo: "OneZeroMiner/onezerominer", supports: &["dynex", "xelis"],
            note: "Spezial-Miner für XelisHashV3 (AMD+NVIDIA) und Dynex (NVIDIA).",
        }),
    ]
}

fn miner_algo(key: &str, algo: &str) -> Option<&'static str> {
    match (key, algo) {
        ("bzminer", "xna") => Some("xna"),
        ("bzminer", "clore") => Some("clore"),
        ("bzminer", "dynex") => Some("dynex"),
        ("bzminer", "xelis") => Some("xelis"),
        ("teamredminer", "xna") | ("teamredminer", "clore") => Some("kawpow"),
        ("srbminer", "xna") | ("srbminer", "clore") => Some("kawpow"),
        ("srbminer", "xelis") => Some("xelishashv3"),
        ("wildrig", "xna") | ("wildrig", "clore") => Some("kawpow"),
        ("onezerominer", "dynex") => Some("dynex"),
        ("onezerominer", "xelis") => Some("xelishashv3"),
        _ => None,
    }
}

fn default_pool(algo: &str) -> &'static str {
    match algo {
        "xna" => "stratum+tcp://pool.woolypooly.com:3128",
        "clore" => "stratum+tcp://pool.woolypooly.com:3118",
        "xelis" => "stratum+tcp://pool.woolypooly.com:3150",
        _ => "stratum+tcp://fr-dynex.miningocean.org:3332",
    }
}

// ---------------- State ----------------
struct AppState {
    child: Option<Child>,
    run_id: u64,          // Generation: alte Rotations-/Reader-Tasks sterben
    bench_running: bool,
}

impl Default for AppState {
    fn default() -> Self {
        Self { child: None, run_id: 0, bench_running: false }
    }
}

fn app_dir(app: &AppHandle) -> PathBuf {
    // Voll portable: ALLES liegt neben der EXE (z.B. F:\mining).
    // Kein AppData, kein Temp — Config + Miner bleiben im Mining-Ordner.
    let _ = app;
    if let Ok(exe) = std::env::current_exe() {
        let s = exe.to_string_lossy().replace('\\', "/");
        if s.contains("/target/debug/") || s.contains("/target/release/") {
            // Dev-Modus: Projekt-Root (glowminer/)
            if let Some(root) = exe.parent().and_then(|p| p.parent()).and_then(|p| p.parent()) {
                return root.to_path_buf();
            }
        }
        if let Some(p) = exe.parent() {
            return p.to_path_buf();
        }
    }
    PathBuf::from(".")
}

fn config_path(app: &AppHandle) -> PathBuf {
    app_dir(app).join("config.json")
}

fn miner_exe(app: &AppHandle, key: &str) -> Option<PathBuf> {
    miners().iter().find(|(k, _)| *k == key).map(|(_, m)| {
        let mut p = app_dir(app);
        for part in m.exe_rel.split('/') {
            p.push(part);
        }
        p
    })
}

fn emit_log(app: &AppHandle, line: &str) {
    let _ = app.emit("mine-log", line.to_string());
}
fn emit_status(app: &AppHandle, running: bool) {
    let _ = app.emit("mine-status", serde_json::json!({ "running": running }));
}

fn power_to_intensity(pct: i64) -> i64 {
    if (pct) >= 100 { 0 } else { (pct * 64 / 100).clamp(6, 64) }
}

// ---------------- DTOs ----------------
#[derive(Serialize)]
struct MinerStatus {
    key: String,
    label: String,
    supports: Vec<String>,
    note: String,
    installed: bool,
    exe: String,
}

#[derive(Deserialize)]
struct MineStartOpts {
    algo: String,
    wallet: String,
    pool: Option<String>,
    worker: Option<String>,
    #[serde(rename = "powerPct")]
    power_pct: i64,
    #[serde(rename = "minerKey")]
    miner_key: String,
    ex: Option<ExOpts>,
}

#[derive(Deserialize, Clone)]
struct ExOpts {
    enabled: bool,
    target: String,
    pct: i64,
    address: String,
}

#[derive(Deserialize)]
struct BenchOpts {
    algo: String,
    wallet: String,
    pool: Option<String>,
    worker: Option<String>,
    sec: u64,
}

#[derive(Serialize, Clone)]
struct BenchResult {
    key: String,
    label: String,
    score: f64,
    text: String,
}

// ---------------- Kommandos ----------------
#[tauri::command]
fn cfg_load(app: AppHandle) -> serde_json::Value {
    std::fs::read_to_string(config_path(&app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(serde_json::json!({}))
}

#[tauri::command]
fn cfg_save(app: AppHandle, data: serde_json::Value) -> bool {
    std::fs::write(config_path(&app), serde_json::to_string_pretty(&data).unwrap_or_default()).is_ok()
}

#[tauri::command]
fn miners_status(app: AppHandle) -> Vec<MinerStatus> {
    miners()
        .into_iter()
        .map(|(key, m)| {
            let exe = miner_exe(&app, key).unwrap_or_default();
            MinerStatus {
                key: key.to_string(),
                label: m.label.to_string(),
                supports: m.supports.iter().map(|s| s.to_string()).collect(),
                note: m.note.to_string(),
                installed: exe.exists(),
                exe: exe.to_string_lossy().to_string(),
            }
        })
        .collect()
}

fn build_cmd(app: &AppHandle, key: &str, algo: &str, wallet: &str, pool: &str, worker: &str, power_pct: i64)
    -> Result<(PathBuf, Vec<String>), String>
{
    let exe = miner_exe(app, key).ok_or_else(|| format!("Unbekannter Miner: {key}"))?;
    let malgo = miner_algo(key, algo)
        .ok_or_else(|| format!("Miner unterstützt {algo} nicht"))?;
    let pool = if pool.trim().is_empty() { default_pool(algo) } else { pool.trim() };
    let pool_no_proto = pool
        .trim_start_matches("stratum+tcp://")
        .trim_start_matches("stratum+ssl://");
    let worker = if worker.trim().is_empty() { "GlowMiner" } else { worker.trim() };
    let intensity = power_to_intensity(power_pct);
    let args: Vec<String> = match key {
        "bzminer" => {
            let mut a = if algo == "dynex" {
                vec!["-a".into(), "dynex".into(), "-p".into(), pool.into(),
                     "-w".into(), wallet.into(), "--pool_password".into(),
                     worker.into(), "--nc".into(), "1".into()]
            } else {
                vec!["-a".into(), malgo.into(), "-w".into(),
                     format!("{wallet}.{worker}"), "-p".into(), pool.into()]
            };
            if intensity != 0 {
                a.push("--i1".into());
                a.push(intensity.to_string());
            }
            if algo == "xelis" {
                // sonst schürft BzMiner zusätzlich auf der CPU
                a.push("--cpu".into());
                a.push("0".into());
            }
            a
        }
        "teamredminer" => vec![
            "-a".into(), malgo.into(), "-o".into(), pool_no_proto.into(),
            "-u".into(), format!("{wallet}.{worker}"),
            "-p".into(), "x".into(), "--watchdog_script=false".into(),
        ],
        "srbminer" => {
            // Worker im Wallet-Feld (Pool-Dokumentation), z.B. WALLET.WORKER
            let mut a = vec![
                "--algorithm".into(), malgo.into(), "--pool".into(), pool_no_proto.into(),
                "--wallet".into(), format!("{wallet}.{worker}"),
                "--password".into(), "x".into(),
            ];
            if intensity != 0 {
                a.push("--intensity".into());
                a.push(intensity.to_string());
            }
            a
        }
        "wildrig" => vec![
            "--algo".into(), malgo.into(), "--url".into(), pool_no_proto.into(),
            "--user".into(), format!("{wallet}.{worker}"),
            "--pass".into(), "x".into(),
            "--opencl-threads".into(), "auto".into(),
        ],
        "onezerominer" => {
            // Pool-dokumentiert: --algo xelishashv3 --pool ... --wallet ADDR.WORKER --pass x
            vec!["--algo".into(), malgo.into(), "--pool".into(), pool_no_proto.into(),
                 "--wallet".into(), format!("{wallet}.{worker}"),
                 "--pass".into(), "x".into()]
        }
        _ => return Err(format!("Unbekannter Miner: {key}")),
    };
    Ok((exe, args))
}

fn spawn_and_stream(app: AppHandle, exe: PathBuf, args: Vec<String>, tag: String, run_id: u64, state: Arc<Mutex<AppState>>) {
    let cwd = exe.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| app_dir(&app));
    let mut child = match Command::new(&exe)
        .args(&args)
        .current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            emit_log(&app, &format!("» start-fehler: {e}"));
            emit_log(&app, "» Hinweis: Falls die EXE eben noch da war, hat fast sicher der Virenscanner");
            emit_log(&app, "» sie in Quarantaene verschoben (Mining-Tools werden als HackTool erkannt).");
            emit_log(&app, &format!("» Loesung: Windows-Sicherheit -> Viren- & Bedrohungsschutz -> Ausschluesse -> Ordner {} hinzufuegen, dann Miner neu laden.", app_dir(&app).display()));
            emit_status(&app, false);
            return;
        }
    };
    emit_log(&app, &format!("» [{tag}] {} {}", exe.display(), args.join(" ")));

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    if let Some(out) = stdout {
        let app2 = app.clone();
        let state2 = state.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(out);
            for line in reader.lines().map_while(Result::ok) {
                if state2.lock().unwrap().run_id != run_id {
                    break;
                }
                emit_log(&app2, &line);
            }
        });
    }
    if let Some(err) = stderr {
        let app2 = app.clone();
        let state2 = state.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(err);
            for line in reader.lines().map_while(Result::ok) {
                if state2.lock().unwrap().run_id != run_id {
                    break;
                }
                emit_log(&app2, &line);
            }
        });
    }
    {
        let mut s = state.lock().unwrap();
        s.child = Some(child);
    }
    emit_status(&app, true);
}

fn stop_child(state: &Arc<Mutex<AppState>>) {
    let mut s = state.lock().unwrap();
    s.run_id += 1; // Reader/Rotation der alten Generation sterben
    if let Some(mut c) = s.child.take() {
        let _ = c.kill();
        let _ = c.wait();
    }
}

#[tauri::command]
fn mine_start(app: AppHandle, state: State<Arc<Mutex<AppState>>>, opts: MineStartOpts) -> Result<(), String> {
    {
        let s = state.lock().unwrap();
        if s.child.is_some() {
            return Err("läuft bereits".into());
        }
    }
    if opts.wallet.trim().is_empty() {
        return Err("Wallet fehlt".into());
    }
    // Miner vorhanden? sonst laden
    let exe_probe = miner_exe(&app, &opts.miner_key).ok_or("Unbekannter Miner")?;
    if !exe_probe.exists() {
        download_miner_blocking(&app, &opts.miner_key)?;
        let exe2 = miner_exe(&app, &opts.miner_key).ok_or("Download fehlgeschlagen")?;
        if !exe2.exists() {
            return Err("Miner-EXE fehlt nach Download".into());
        }
    }
    let pool = opts.pool.clone().unwrap_or_default();
    let worker = opts.worker.clone().unwrap_or_default();
    let power = opts.power_pct;
    let key = opts.miner_key.clone();
    let algo = opts.algo.clone();
    let own_wallet = opts.wallet.trim().to_string();
    emit_log(&app, "» kein OC/UV – nur Intensity.");

    let run_id = {
        let mut s = state.lock().unwrap();
        s.run_id += 1;
        s.run_id
    };

    match opts.ex.clone() {
        Some(ex) if ex.enabled && ex.pct > 0 && ex.pct < 100 => {
            if ex.address.trim().is_empty() {
                return Err("Exchange-Deposit fehlt".into());
            }
            let ex_addr = ex.address.trim().to_string();
            let target = ex.target.clone();
            let pct = ex.pct.clamp(1, 99);
            emit_log(&app, &format!(
                "» Split aktiv: {own}% eigen / {pct}% Exchange ({target}) pro 60 Min.",
                own = 100 - pct
            ));
            // Start mit eigener Wallet
            let (exe, args) = build_cmd(&app, &key, &algo, &own_wallet, &pool, &worker, power)?;
            spawn_and_stream(app.clone(), exe, args, "EIGEN".into(), run_id, state.inner().clone());
            // Rotations-Watcher
            let app2 = app.clone();
            let state2 = state.inner().clone();
            std::thread::spawn(move || {
                let mut next_exchange = true;
                let mut waited: u64 = 0;
                let mut limit = ((100 - pct) as u64) * 60;
                loop {
                    std::thread::sleep(Duration::from_secs(5));
                    if state2.lock().unwrap().run_id != run_id {
                        return;
                    }
                    waited += 5;
                    if waited < limit {
                        continue;
                    }
                    waited = 0;
                    // Umschalten
                    stop_child_keep_id(&state2);
                    if next_exchange {
                        emit_log(&app2, &format!(">> Wechsel → EXCHANGE ({target})"));
                        if let Ok((exe, args)) = build_cmd(&app2, &key, &algo, &ex_addr, &pool, &worker, power) {
                            spawn_and_stream(app2.clone(), exe, args, "EXCHANGE".into(), run_id, state2.clone());
                        }
                        limit = (pct as u64) * 60;
                    } else {
                        emit_log(&app2, ">> Wechsel → EIGENE WALLET");
                        if let Ok((exe, args)) = build_cmd(&app2, &key, &algo, &own_wallet, &pool, &worker, power) {
                            spawn_and_stream(app2.clone(), exe, args, "EIGEN".into(), run_id, state2.clone());
                        }
                        limit = ((100 - pct) as u64) * 60;
                    }
                    next_exchange = !next_exchange;
                }
            });
            Ok(())
        }
        Some(ex) if ex.enabled && ex.pct >= 100 => {
            if ex.address.trim().is_empty() {
                return Err("Exchange-Deposit fehlt".into());
            }
            emit_log(&app, &format!("» 100% direkt auf Exchange-Deposit ({}).", ex.target));
            let (exe, args) = build_cmd(&app, &key, &algo, ex.address.trim(), &pool, &worker, power)?;
            spawn_and_stream(app, exe, args, "EXCHANGE".into(), run_id, state.inner().clone());
            Ok(())
        }
        _ => {
            let (exe, args) = build_cmd(&app, &key, &algo, &own_wallet, &pool, &worker, power)?;
            spawn_and_stream(app, exe, args, algo.to_uppercase(), run_id, state.inner().clone());
            Ok(())
        }
    }
}

/// Stoppt Child ohne run_id zu erhöhen (für Rotation).
fn stop_child_keep_id(state: &Arc<Mutex<AppState>>) {
    let mut s = state.lock().unwrap();
    if let Some(mut c) = s.child.take() {
        let _ = c.kill();
        let _ = c.wait();
    }
}

#[tauri::command]
fn mine_stop(state: State<Arc<Mutex<AppState>>>, app: AppHandle) {
    stop_child(&state.inner().clone());
    emit_status(&app, false);
}

// ---------------- Downloads ----------------
#[derive(Deserialize)]
struct GhAsset {
    name: String,
    browser_download_url: String,
}
#[derive(Deserialize)]
struct GhRelease {
    assets: Vec<GhAsset>,
}

fn download_miner_blocking(app: &AppHandle, key: &str) -> Result<PathBuf, String> {
    let meta = miners().into_iter().find(|(k, _)| *k == key).map(|(_, m)| m)
        .ok_or_else(|| format!("Unbekannter Miner: {key}"))?;
    emit_log(app, &format!("» [{}] suche Release {} …", key, meta.repo));
    let client = reqwest::blocking::Client::builder()
        .user_agent("glowminer")
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let rel: GhRelease = client
        .get(format!("https://api.github.com/repos/{}/releases/latest", meta.repo))
        .send()
        .map_err(|e| e.to_string())?
        .json()
        .map_err(|e| e.to_string())?;
    let pick = rel.assets.iter().find(|a| {
        let n = a.name.to_lowercase();
        if !n.ends_with(".zip") || !(n.contains("win") || n.contains("windows")) {
            return false;
        }
        if key == "teamredminer" && !n.contains("win64") {
            return false;
        }
        true
    }).or_else(|| rel.assets.iter().find(|a| a.name.to_lowercase().ends_with(".zip")))
        .ok_or_else(|| "kein Windows-ZIP im Release gefunden".to_string())?;
    emit_log(app, &format!("» [{}] lade {} …", key, pick.name));
    let bytes = client.get(&pick.browser_download_url)
        .send().map_err(|e| e.to_string())?
        .bytes().map_err(|e| e.to_string())?;
    let dest_dir = app_dir(app).join(key);
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
    let zpath = dest_dir.join(format!("{key}_win.zip"));
    std::fs::write(&zpath, &bytes).map_err(|e| e.to_string())?;
    let file = std::fs::File::open(&zpath).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    zip.extract(&dest_dir).map_err(|e| e.to_string())?;
    let want = PathBuf::from(meta.exe_rel).file_name()
        .and_then(|n| n.to_str()).unwrap_or("").to_lowercase();
    let found = find_file_recursive(&dest_dir, &|name: &str| name.to_lowercase() == want)
        .or_else(|| find_file_recursive(&dest_dir, &|name: &str| name.to_lowercase().ends_with(".exe")));
    match found {
        Some(p) => {
            emit_log(app, &format!("» [{}] fertig: {}", key, p.display()));
            Ok(p)
        }
        None => Err("entpackt, aber keine .exe gefunden".into()),
    }
}

fn find_file_recursive(dir: &std::path::Path, pred: &dyn Fn(&str) -> bool) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    // erst Dateien dieser Ebene
    let mut subdirs = Vec::new();
    for e in entries.flatten() {
        let p = e.path();
        if p.is_dir() {
            subdirs.push(p);
        } else if let Some(name) = p.file_name().and_then(|n| n.to_str()) {
            if pred(name) {
                return Some(p);
            }
        }
    }
    for d in subdirs {
        if let Some(f) = find_file_recursive(&d, pred) {
            return Some(f);
        }
    }
    None
}

#[tauri::command]
fn defender_exclude(app: AppHandle) -> Result<String, String> {
    let dir = app_dir(&app);
    // Braucht Admin-Rechte — sonst Fehlermeldung mit manueller Anleitung
    let out = Command::new("powershell.exe")
        .args(["-NoProfile", "-Command",
               &format!("Add-MpPreference -ExclusionPath '{}'", dir.display())])
        .output()
        .map_err(|e| format!("Powershell-Fehler: {e}"))?;
    if out.status.success() {
        Ok(format!("Ausnahme gesetzt für: {}", dir.display()))
    } else {
        let err = String::from_utf8_lossy(&out.stderr).trim().to_string();
        Err(format!(
            "Nicht gesetzt (Admin nötig?). Manuell: Windows-Sicherheit -> Viren- & Bedrohungsschutz -> Ausschlüsse -> Ordner hinzufügen: {} ({})",
            dir.display(),
            if err.is_empty() { "Zugriff verweigert" } else { err.as_str() }
        ))
    }
}
#[tauri::command]
fn miner_download(app: AppHandle, key: String) -> Result<bool, String> {
    download_miner_blocking(&app, &key)?;
    Ok(true)
}

#[tauri::command]
fn miner_download_all(app: AppHandle, algo: String) -> Result<bool, String> {
    for (key, _) in miners().into_iter().filter(|(_, m)| m.supports.contains(&algo.as_str())) {
        let exe = miner_exe(&app, key).unwrap_or_default();
        if exe.exists() {
            emit_log(&app, &format!("» [{key}] bereits vorhanden."));
        } else if let Err(e) = download_miner_blocking(&app, key) {
            emit_log(&app, &format!("» [{key}] fehler: {e}"));
        }
    }
    emit_log(&app, "» alle kompatiblen Miner geladen.");
    Ok(true)
}

// ---------------- Benchmark ----------------
fn parse_hs(text: &str) -> f64 {
    let re = Regex::new(r"(?i)(\d+(?:[.,]\d+)?)\s*(GH/s|MH/s|kH/s|H/s)").unwrap();
    let mut best: f64 = 0.0;
    for cap in re.captures_iter(text) {
        let val: f64 = cap[1].replace(',', ".").parse().unwrap_or(0.0);
        let mult = match cap[2].to_uppercase().as_str() {
            s if s.starts_with("GH") => 1e9,
            s if s.starts_with("MH") => 1e6,
            s if s.starts_with("KH") => 1e3,
            _ => 1.0,
        };
        best = best.max(val * mult);
    }
    best
}

fn format_de(v: f64) -> String {
    let s = format!("{:.0}", v);
    let mut out = String::new();
    for (i, ch) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push('.');
        }
        out.push(ch);
    }
    out.chars().rev().collect()
}

#[tauri::command]
fn bench_start(app: AppHandle, state: State<Arc<Mutex<AppState>>>, opts: BenchOpts) -> Result<Vec<BenchResult>, String> {
    {
        let s = state.lock().unwrap();
        if s.child.is_some() {
            return Err("Bitte erst Stop drücken".into());
        }
        if s.bench_running {
            return Err("Benchmark läuft bereits".into());
        }
    }
    {
        let mut s = state.lock().unwrap();
        s.bench_running = true;
    }
    if opts.wallet.trim().is_empty() {
        state.lock().unwrap().bench_running = false;
        return Err("Wallet fehlt".into());
    }
    let keys: Vec<String> = miners()
        .into_iter()
        .filter(|(_, m)| m.supports.contains(&opts.algo.as_str()))
        .map(|(k, _)| k.to_string())
        .collect();
    let _ = app.emit("bench-update", serde_json::json!({
        "type": "start", "keys": keys, "sec": opts.sec
    }));
    let mut results = Vec::new();
    for key in &keys {
        // ggf. laden
        let exe = miner_exe(&app, key).unwrap_or_default();
        if !exe.exists() {
            let _ = app.emit("bench-update", serde_json::json!({
                "type": "progress", "key": key, "text": "lade …"
            }));
            if let Err(e) = download_miner_blocking(&app, key) {
                let label = key.clone();
                results.push(BenchResult { key: key.clone(), label, score: 0.0, text: format!("download: {e}") });
                continue;
            }
        }
        let _ = app.emit("bench-update", serde_json::json!({
            "type": "progress", "key": key, "text": format!("teste {}s …", opts.sec)
        }));
        let r = bench_one_timed(&app, key, &opts, opts.sec.clamp(20, 300));
        let _ = app.emit("bench-update", serde_json::json!({
            "type": "progress", "key": key, "text": r.text.clone()
        }));
        results.push(r);
    }
    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    let _ = app.emit("bench-update", serde_json::json!({ "type": "done", "results": results }));
    state.lock().unwrap().bench_running = false;
    Ok(results)
}

/// Benchmark mit echter Laufzeit: liest stdout live für `sec` Sekunden.
fn bench_one_timed(app: &AppHandle, key: &str, opts: &BenchOpts, sec: u64) -> BenchResult {
    let label = miners().into_iter().find(|(k, _)| *k == key).map(|(_, m)| m.label).unwrap_or(key);
    let mk = || BenchResult { key: key.into(), label: label.into(), score: 0.0, text: String::new() };
    let (exe, args) = match build_cmd(
        app, key, &opts.algo, opts.wallet.trim(),
        &opts.pool.clone().unwrap_or_default(),
        &opts.worker.clone().unwrap_or_default(), 100,
    ) {
        Ok(v) => v,
        Err(e) => { let mut r = mk(); r.text = format!("skip: {e}"); return r; }
    };
    if !exe.exists() {
        let mut r = mk(); r.text = "exe fehlt".into(); return r;
    }
    let mut child = match Command::new(&exe)
        .args(&args)
        .current_dir(exe.parent().unwrap_or(std::path::Path::new(".")))
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(_) => { let mut r = mk(); r.text = "start-fehler".into(); return r; }
    };
    let start = Instant::now();
    let mut tail = String::new();
    let mut peak: f64 = 0.0;
    if let Some(out) = child.stdout.take() {
        let reader = BufReader::new(out);
        // Blockierend lesen, aber nach `sec` abbrechen: Reader in Thread, Hauptthread wartet
        let (tx, rx) = std::sync::mpsc::channel::<String>();
        std::thread::spawn(move || {
            for line in reader.lines().map_while(Result::ok) {
                if tx.send(line).is_err() {
                    break;
                }
            }
        });
        while start.elapsed() < Duration::from_secs(sec) {
            match rx.recv_timeout(Duration::from_millis(500)) {
                Ok(line) => {
                    peak = peak.max(parse_hs(&line));
                    tail.push_str(&line);
                    tail.push('\n');
                    if tail.len() > 8000 {
                        tail.drain(..tail.len() - 8000);
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // läuft noch?
                    match child.try_wait() {
                        Ok(Some(_)) => break,
                        Ok(None) => {}
                        Err(_) => break,
                    }
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    }
    let _ = child.kill();
    let _ = child.wait();
    let score = parse_hs(&tail).max(peak);
    let mut r = mk();
    r.score = score;
    r.text = format!("{} H/s", format_de(score));
    r
}

pub fn run() {
    let state: Arc<Mutex<AppState>> = Arc::new(Mutex::new(AppState::default()));
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            cfg_load,
            cfg_save,
            miners_status,
            miner_download,
            miner_download_all,
            defender_exclude,
            mine_start,
            mine_stop,
            bench_start,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri-Start fehlgeschlagen");
}

fn main() {
    run();
}
