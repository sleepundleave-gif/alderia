package com.alderia.couronne;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.AssetManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ALDÉRIA POUR ANDROID
 *
 * Une fenêtre en paysage, plein écran, qui affiche le jeu. Le jeu est le même que celui du navigateur ; tous ses
 * fichiers sont rangés dans l'application : il fonctionne SANS CONNEXION.
 *
 *  - La page du jeu est demandée à l'adresse https://alderia.jeu/ ; cette adresse n'existe pas sur Internet :
 *    chaque demande est servie par l'application elle-même (servir), depuis ses fichiers ou depuis la dernière
 *    mise à jour posée (voir Maj.java). Toute autre adresse est refusée.
 *  - Les sauvegardes sont gardées par la page (mémoire locale de https://alderia.jeu/). Elles restent quand on
 *    installe une mise à jour du jeu ou une nouvelle version de l'application par-dessus l'ancienne.
 *  - La page parle à l'application par « AlderiaApp » (classe Pont) : version, encoches de l'écran, mises à jour.
 */
public class MainActivity extends Activity {
    static final String HOTE = "alderia.jeu", RACINE = "https://" + HOTE + "/", JOURNAL = "Alderia";
    private static final int DEMANDE_FICHIER = 41;
    private static final Pattern PREFIXE = Pattern.compile("^(/v/[0-9a-z]+)+(?=/)");

    private WebView web;
    private Maj maj;
    private SharedPreferences prefs;
    private volatile String encoches = "0,0,0,0";
    private final AtomicBoolean occupe = new AtomicBoolean(false);
    private final AtomicBoolean annonce = new AtomicBoolean(false);
    /** Les téléchargements d'application ne s'ouvrent que chez GitHub. */
    private static final String DEPOT = "https://github.com/";

    @Override protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        if (Build.VERSION.SDK_INT >= 28) {                       // écran à encoche : on dessine jusqu'au bord
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        prefs = getSharedPreferences("alderia", MODE_PRIVATE);

        try {
            maj = new Maj(new File(getFilesDir(), "jeu"), new Maj.Source() {
                public InputStream ouvrir(String chemin) throws IOException {
                    try { return getAssets().open("jeu/" + chemin, AssetManager.ACCESS_STREAMING); } catch (FileNotFoundException e) { return null; }
                }
            }, codeAppli());
        } catch (IOException e) { fin("L'application est incomplète : réinstallez le fichier APK.\n(" + e.getMessage() + ")"); return; }

        try { web = new WebView(this); }
        catch (Throwable t) { fin("Ce téléphone n'a pas le composant « Android System WebView », nécessaire au jeu. Installez-le ou mettez-le à jour depuis le Play Store."); return; }
        setContentView(web, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        pleinEcran();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                            // les sauvegardes
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);            // la musique peut démarrer seule
        s.setTextZoom(100);                                      // le réglage « taille du texte » du téléphone ne déforme pas l'interface
        s.setSupportZoom(false); s.setBuiltInZoomControls(false); s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true); s.setLoadWithOverviewMode(false);
        s.setAllowFileAccess(false); s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);               // toujours les fichiers en vigueur, jamais une vieille copie
        web.setBackgroundColor(0xff0d1018);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false); web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(false);
        web.setOnLongClickListener(new View.OnLongClickListener() { public boolean onLongClick(View v) { return true; } });   // pas de menu « copier » en jouant
        web.setFocusable(true); web.setFocusableInTouchMode(true);

        if (Build.VERSION.SDK_INT >= 28) web.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            public WindowInsets onApplyWindowInsets(View v, WindowInsets in) {
                DisplayCutout c = in.getDisplayCutout(); float d = getResources().getDisplayMetrics().density;
                encoches = c == null ? "0,0,0,0" : Math.round(c.getSafeInsetLeft() / d) + "," + Math.round(c.getSafeInsetTop() / d) + "," + Math.round(c.getSafeInsetRight() / d) + "," + Math.round(c.getSafeInsetBottom() / d);
                js("window.__encoches&&window.__encoches()");
                return v.onApplyWindowInsets(in);
            }
        });

        web.addJavascriptInterface(new Pont(), "AlderiaApp");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage m) { Log.d(JOURNAL, m.message() + " (" + m.sourceId() + ":" + m.lineNumber() + ")"); return true; }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) { return servir(r.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return !HOTE.equals(r.getUrl().getHost()); }
            @SuppressWarnings("deprecation")
            @Override public boolean shouldOverrideUrlLoading(WebView v, String adresse) { return !HOTE.equals(Uri.parse(adresse).getHost()); }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                // le moteur d'affichage a été arrêté par le système (mémoire) : on relance la fenêtre, la sauvegarde est intacte
                if (web != null) { ViewGroup p = (ViewGroup) web.getParent(); if (p != null) p.removeView(web); web.destroy(); web = null; }
                recreate(); return true;
            }
        });

        // Un moteur trop ancien ne sait pas lire le jeu : on le dit au lieu d'afficher un écran noir
        Matcher m = Pattern.compile("Chrom(?:e|ium)/(\\d+)").matcher(String.valueOf(s.getUserAgentString()));
        if (m.find() && Integer.parseInt(m.group(1)) < 80)
            new AlertDialog.Builder(this).setTitle("Composant à mettre à jour")
                .setMessage("Le composant « Android System WebView » de ce téléphone est ancien (version " + m.group(1) + "). Si le jeu ne s'affiche pas, mettez-le à jour depuis le Play Store, puis relancez Aldéria.")
                .setPositiveButton("Compris", null).show();

        web.loadUrl(RACINE + "index.html");
        web.requestFocus();
    }

    // ------------------------------------------------------------ servir les fichiers du jeu
    private WebResourceResponse servir(Uri u) {
        if (u == null || !HOTE.equals(u.getHost())) return vide(403, "Refuse");             // le jeu ne demande rien à Internet
        String c = u.getPath(); if (c == null) c = "/";
        c = PREFIXE.matcher(c).replaceFirst("");
        while (c.startsWith("/")) c = c.substring(1);
        if (c.length() == 0) c = "index.html";
        if (c.equals("journal")) return vide(204, "No Content");
        Maj mj = maj;
        InputStream in = mj != null && Maj.sur(c) ? mj.ouvrir(c) : null;
        if (in == null) return vide(404, "Not Found");
        Map<String, String> h = new HashMap<String, String>();
        h.put("Cache-Control", "no-store"); h.put("Access-Control-Allow-Origin", "*");
        String type = type(c);
        return new WebResourceResponse(type, type.startsWith("text/") || type.endsWith("json") || type.endsWith("xml") ? "utf-8" : null, 200, "OK", h, in);
    }

    private static WebResourceResponse vide(int code, String raison) {
        Map<String, String> h = new HashMap<String, String>(); h.put("Cache-Control", "no-store"); h.put("Access-Control-Allow-Origin", "*");
        return new WebResourceResponse("text/plain", "utf-8", code, raison, h, new ByteArrayInputStream(new byte[0]));
    }

    private static String type(String c) {
        int i = c.lastIndexOf('.'); String e = i < 0 ? "" : c.substring(i + 1).toLowerCase();
        if (e.equals("html") || e.equals("htm")) return "text/html";
        if (e.equals("js") || e.equals("mjs")) return "text/javascript";
        if (e.equals("css")) return "text/css";
        if (e.equals("json") || e.equals("map")) return "application/json";
        if (e.equals("gltf")) return "model/gltf+json";
        if (e.equals("glb")) return "model/gltf-binary";
        if (e.equals("png")) return "image/png";
        if (e.equals("jpg") || e.equals("jpeg")) return "image/jpeg";
        if (e.equals("webp")) return "image/webp";
        if (e.equals("svg")) return "image/svg+xml";
        if (e.equals("ico")) return "image/x-icon";
        if (e.equals("txt")) return "text/plain";
        if (e.equals("wasm")) return "application/wasm";
        if (e.equals("mp3")) return "audio/mpeg";
        if (e.equals("ogg")) return "audio/ogg";
        if (e.equals("woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    // ------------------------------------------------------------ ce que la page peut demander à l'application
    private class Pont {
        /** Versions de l'application et du jeu, en JSON. */
        @JavascriptInterface public String infos() {
            try {
                Maj.Manifeste a = maj.actif();
                JSONObject o = new JSONObject();
                o.put("app", nomAppli()); o.put("code", codeAppli()); o.put("jeu", a.version); o.put("nom", a.nom);
                o.put("base", maj.base().version); o.put("maj", maj.miseAJourInstallee());
                o.put("adresse", prefs.getString("adresse", getString(R.string.adresse_maj)));
                return o.toString();
            } catch (Exception e) { return "{}"; }
        }
        /** Zones de l'écran mangées par une encoche : « gauche,haut,droite,bas », en points de la page. */
        @JavascriptInterface public String encoches() { return encoches; }
        /** Cherche une mise à jour en ligne à cette adresse (retenue pour la prochaine fois). */
        @JavascriptInterface public void chercher(String adresse) {
            final String a = adresse == null ? "" : adresse.trim();
            if (!a.matches("(?i)https?://.+")) { dire("echec", "Indiquez l'adresse du dossier des mises à jour (elle commence par https://).", -1); return; }
            prefs.edit().putString("adresse", a).apply();
            lancer(new Tache() { public Maj.Manifeste faire(Maj.Suivi s) throws Exception { return maj.enLigne(a, s); } });
        }
        /** Regarde sans bruit s'il existe en ligne une version plus récente du jeu ou de l'application. Rien n'est téléchargé :
         *  la page est seulement prévenue (window.__nouveau), et c'est le joueur qui décide d'installer. Sans connexion, il ne se passe rien. */
        @JavascriptInterface public void verifier() {
            final String a = String.valueOf(prefs.getString("adresse", getString(R.string.adresse_maj))).trim();
            if (!a.matches("(?i)https?://.+") || !annonce.compareAndSet(false, true)) return;
            new Thread(new Runnable() { public void run() {
                try {
                    JSONObject o = new JSONObject();
                    try { Maj.Manifeste n = maj.annonce(a); if (n != null) { o.put("jeu", n.version); o.put("nom", n.nom); o.put("appMin", n.appMin); } }
                    catch (Exception e) { Log.d(JOURNAL, "annonce du jeu : " + e); }
                    try {
                        String[] p = Maj.application(a);
                        if (p != null && Integer.parseInt(p[0]) > codeAppli() && p[2].startsWith(DEPOT)) { o.put("appCode", Integer.parseInt(p[0])); o.put("appNom", p[1]); o.put("lien", p[2]); }
                    } catch (Exception e) { Log.d(JOURNAL, "annonce de l'application : " + e); }
                    if (o.length() > 0) js("window.__nouveau&&window.__nouveau(" + o.toString() + ")");
                } catch (Throwable t) { Log.w(JOURNAL, "annonce : " + t); }
                finally { annonce.set(false); }
            } }, "annonce").start();
        }
        /** Ouvre dans le navigateur du téléphone la page de téléchargement de la nouvelle application (GitHub seulement). */
        @JavascriptInterface public void ouvrir(final String lien) {
            if (lien == null || !lien.startsWith(DEPOT)) return;
            runOnUiThread(new Runnable() { public void run() {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(lien))); }
                catch (Exception e) { dire("echec", "Aucun navigateur pour ouvrir " + lien, -1); }
            } });
        }
        /** Ouvre le sélecteur de fichiers du téléphone pour choisir un fichier de mise à jour (.zip). */
        @JavascriptInterface public void choisirFichier() {
            runOnUiThread(new Runnable() { public void run() {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT); i.addCategory(Intent.CATEGORY_OPENABLE); i.setType("*/*");
                try { startActivityForResult(i, DEMANDE_FICHIER); }
                catch (ActivityNotFoundException e) {
                    Intent j = new Intent(Intent.ACTION_GET_CONTENT); j.addCategory(Intent.CATEGORY_OPENABLE); j.setType("*/*");
                    try { startActivityForResult(Intent.createChooser(j, "Fichier de mise à jour"), DEMANDE_FICHIER); }
                    catch (ActivityNotFoundException e2) { dire("echec", "Ce téléphone n'a pas d'application pour choisir un fichier.", -1); }
                }
            } });
        }
        /** Efface la mise à jour posée et revient au jeu livré avec l'application. */
        @JavascriptInterface public void retablir() { retablirPuisRecharger(); }
        @JavascriptInterface public void quitter() { runOnUiThread(new Runnable() { public void run() { finish(); } }); }
    }

    private interface Tache { Maj.Manifeste faire(Maj.Suivi s) throws Exception; }

    /** Une mise à jour à la fois, hors du fil de l'affichage ; la page est prévenue de l'avancement, puis rechargée. */
    private void lancer(final Tache t) {
        if (!occupe.compareAndSet(false, true)) { dire("cours", "Une mise à jour est déjà en cours…", -1); return; }
        new Thread(new Runnable() { public void run() {
            try {
                final long[] dernier = { 0 };
                Maj.Manifeste n = t.faire(new Maj.Suivi() { public void etape(String texte, double part) {
                    long m = System.currentTimeMillis(); if (m - dernier[0] < 120 && part < 1) return; dernier[0] = m; dire("cours", texte, part);
                } });
                if (n == null) dire("ajour", "Le jeu est à jour (version " + maj.actif().version + ").", -1);
                else { dire("fait", "Mise à jour installée : " + (n.nom.length() > 0 ? n.nom : "version " + n.version) + ". Le jeu redémarre…", 1); recharger(1400); }
            } catch (Maj.Echec e) { dire("echec", e.getMessage(), -1); }
            catch (FileNotFoundException e) { dire("echec", "Aucune mise à jour trouvée à cette adresse.", -1); }
            catch (IOException e) { dire("echec", "La mise à jour n'a pas pu être reçue (" + (e.getMessage() == null ? "connexion" : e.getMessage()) + "). Rien n'a été changé. Vérifiez la connexion et réessayez.", -1); }
            catch (Exception e) { dire("echec", "Mise à jour impossible : " + e, -1); }
            finally { occupe.set(false); }
        } }, "maj").start();
    }

    @Override protected void onActivityResult(int demande, int resultat, final Intent donnees) {
        super.onActivityResult(demande, resultat, donnees);
        if (demande != DEMANDE_FICHIER) return;
        if (resultat != RESULT_OK || donnees == null || donnees.getData() == null) { dire("annule", "", -1); return; }
        final Uri u = donnees.getData();
        lancer(new Tache() { public Maj.Manifeste faire(Maj.Suivi s) throws Exception {
            File zip = new File(getCacheDir(), "maj.zip");
            try {
                s.etape("Lecture du fichier…", -1);
                InputStream in = getContentResolver().openInputStream(u);
                if (in == null) throw new IOException("fichier illisible");
                try { OutputStream out = new FileOutputStream(zip); try { byte[] b = new byte[65536]; int k; while ((k = in.read(b)) > 0) out.write(b, 0, k); } finally { out.close(); } } finally { in.close(); }
                return maj.depuisZip(zip, s);
            } finally { zip.delete(); }
        } });
    }

    private void retablirPuisRecharger() {
        if (!occupe.compareAndSet(false, true)) return;
        try { maj.retablir(); } finally { occupe.set(false); }
        dire("fait", "Version d'origine rétablie (version " + maj.actif().version + "). Le jeu redémarre…", 1);
        recharger(1200);
    }

    private void recharger(final long attente) {
        runOnUiThread(new Runnable() { public void run() {
            if (web == null) return;
            web.postDelayed(new Runnable() { public void run() { if (web != null) { web.clearCache(true); web.loadUrl(RACINE + "index.html"); } } }, attente);
        } });
    }

    /** Prévient la page : état (« cours », « fait », « ajour », « echec », « annule »), texte, part faite. */
    private void dire(String etat, String texte, double part) {
        js("window.__maj&&window.__maj(" + JSONObject.quote(etat) + "," + JSONObject.quote(texte == null ? "" : texte) + "," + part + ")");
    }

    private void js(final String code) {
        runOnUiThread(new Runnable() { public void run() { if (web != null) try { web.evaluateJavascript(code, null); } catch (Throwable t) { Log.w(JOURNAL, "js : " + t); } } });
    }

    // ------------------------------------------------------------ la touche Retour
    @Override public void onBackPressed() {
        if (web == null) { finish(); return; }
        // la page décide d'abord (fermer un menu, ouvrir le menu du jeu) ; sinon on propose de quitter
        web.evaluateJavascript("(function(){try{return !!(window.__retour&&window.__retour())}catch(e){return false}})()", new ValueCallback<String>() {
            public void onReceiveValue(String v) { if (!"true".equals(v)) demanderQuitter(); }
        });
    }

    private void demanderQuitter() {
        AlertDialog.Builder b = new AlertDialog.Builder(this).setTitle("Quitter Aldéria ?")
            .setMessage("La partie est enregistrée à chaque statue d'Aube et au début de chaque scène.")
            .setPositiveButton("Quitter", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int i) { finish(); } })
            .setNegativeButton("Rester", null);
        if (maj != null && maj.miseAJourInstallee())             // filet de secours : une mise à jour qui empêcherait le jeu de démarrer peut toujours être retirée d'ici
            b.setNeutralButton("Retirer la mise à jour", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int i) { retablirPuisRecharger(); } });
        AlertDialog d = b.create();
        d.setOnDismissListener(new DialogInterface.OnDismissListener() { public void onDismiss(DialogInterface x) { pleinEcran(); } });
        d.show();
    }

    // ------------------------------------------------------------ plein écran, pause, reprise
    private void pleinEcran() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }
    @Override public void onWindowFocusChanged(boolean actif) { super.onWindowFocusChanged(actif); if (actif) pleinEcran(); }
    @Override protected void onPause() { super.onPause(); if (web != null) { js("window.__pause&&window.__pause(true)"); web.onPause(); } }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); js("window.__pause&&window.__pause(false)"); } pleinEcran(); }
    @Override protected void onDestroy() { if (web != null) { ViewGroup p = (ViewGroup) web.getParent(); if (p != null) p.removeView(web); web.destroy(); web = null; } super.onDestroy(); }

    // ------------------------------------------------------------ outils
    private int codeAppli() { try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionCode; } catch (Exception e) { return 0; } }
    private String nomAppli() { try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return ""; } }
    private void fin(String message) {
        new AlertDialog.Builder(this).setTitle("Aldéria").setMessage(message).setCancelable(false)
            .setPositiveButton("Fermer", new DialogInterface.OnClickListener() { public void onClick(DialogInterface d, int i) { finish(); } }).show();
    }
}
