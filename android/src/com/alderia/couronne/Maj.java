package com.alderia.couronne;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/**
 * MISES À JOUR DU JEU (nouveaux chapitres), sans réinstaller l'application.
 *
 * Le jeu livré dans l'application (dossier « jeu » des assets) a un manifeste : manifeste.txt, la liste de tous ses
 * fichiers avec leur empreinte (SHA-256) et leur taille, et un numéro de version.
 * Une mise à jour apporte un manifeste plus récent et les seuls fichiers qui ont changé. Ils sont rangés dans le
 * dossier privé de l'application (dossier/f/...). Pour servir un fichier, on regarde le manifeste en vigueur :
 * même empreinte que dans l'application : on prend celui de l'application ; sinon celui de la mise à jour.
 *
 * Rien n'est remplacé tant que tout n'est pas vérifié : la mise à jour est préparée à côté (dossier.tmp), chaque
 * fichier est comparé à son empreinte, puis les dossiers sont échangés d'un coup. Une mise à jour coupée en route
 * ou abîmée laisse donc le jeu comme il était. Les sauvegardes ne sont pas touchées (elles sont ailleurs).
 *
 * Cette classe n'utilise rien d'Android : elle est essayée sur un ordinateur (android/essais/EssaiMaj.java).
 */
public class Maj {
    /** D'où viennent les fichiers livrés avec l'application. */
    public interface Source { InputStream ouvrir(String chemin) throws IOException; }
    /** Pour montrer l'avancement : un texte et une part faite (0 à 1, ou -1 si inconnue). */
    public interface Suivi { void etape(String texte, double part); }

    public static final String MANIFESTE = "manifeste.txt";

    public static class Fichier { public final String empreinte; public final long taille; Fichier(String e, long t) { empreinte = e; taille = t; } }

    public static class Manifeste {
        public int version; public String nom = ""; public int appMin = 0;
        public final Map<String, Fichier> fichiers = new LinkedHashMap<String, Fichier>();
        public long poids() { long n = 0; for (Fichier f : fichiers.values()) n += f.taille; return n; }
    }

    public static class Echec extends Exception { public Echec(String m) { super(m); } }

    private final File dossier, tmp, ancien;
    private final Source appli;
    private final int codeAppli;
    private Manifeste base, actif;

    public Maj(File dossier, Source appli, int codeAppli) throws IOException {
        this.dossier = dossier; this.tmp = new File(dossier.getPath() + ".tmp"); this.ancien = new File(dossier.getPath() + ".ancien");
        this.appli = appli; this.codeAppli = codeAppli;
        charger();
    }

    public synchronized Manifeste actif() { return actif; }
    public synchronized Manifeste base() { return base; }
    public synchronized boolean miseAJourInstallee() { return actif != base; }

    /** Au démarrage : quel manifeste est en vigueur ? Répare aussi un échange de dossiers coupé en route. */
    private synchronized void charger() throws IOException {
        InputStream in = appli.ouvrir(MANIFESTE);
        if (in == null) throw new IOException("manifeste absent de l'application");
        try { base = lire(in); } catch (Echec e) { throw new IOException(e.getMessage()); } finally { in.close(); }
        if (!dossier.exists() && ancien.exists()) ancien.renameTo(dossier);       // l'échange avait été coupé : on reprend l'ancienne
        effacer(tmp); effacer(ancien);
        actif = base;
        File m = new File(dossier, MANIFESTE);
        if (m.exists()) {
            Manifeste pose = null;
            try { InputStream i = new FileInputStream(m); try { pose = lire(i); } finally { i.close(); } } catch (Exception e) { pose = null; }
            // une application plus récente que la mise à jour posée (ou une mise à jour illisible) : on revient aux fichiers de l'application
            if (pose != null && pose.version > base.version && complet(pose)) actif = pose; else effacer(dossier);
        } else if (dossier.exists()) effacer(dossier);
    }

    /** Tous les fichiers que la mise à jour doit fournir sont-ils là, avec la bonne taille ? */
    private boolean complet(Manifeste m) {
        for (Map.Entry<String, Fichier> e : m.fichiers.entrySet()) {
            Fichier b = base.fichiers.get(e.getKey());
            if (b != null && b.empreinte.equals(e.getValue().empreinte)) continue;
            File f = new File(dossier, "f/" + e.getKey());
            if (!f.isFile() || f.length() != e.getValue().taille) return false;
        }
        return true;
    }

    /** Ouvre un fichier du jeu en vigueur ; null s'il n'existe pas. */
    public InputStream ouvrir(String chemin) {
        Manifeste m; Manifeste b;
        synchronized (this) { m = actif; b = base; }
        try {
            if (m != b) {
                Fichier f = m.fichiers.get(chemin);
                if (f == null) return MANIFESTE.equals(chemin) ? new FileInputStream(new File(dossier, MANIFESTE)) : null;
                Fichier fb = b.fichiers.get(chemin);
                if (fb == null || !fb.empreinte.equals(f.empreinte)) return new FileInputStream(new File(dossier, "f/" + chemin));
            }
            return appli.ouvrir(chemin);
        } catch (IOException e) { return null; }
    }

    /** Taille d'un fichier du jeu en vigueur (-1 si inconnue). */
    public long taille(String chemin) {
        Manifeste m; synchronized (this) { m = actif; }
        Fichier f = m.fichiers.get(chemin); return f == null ? -1 : f.taille;
    }

    // ---------------------------------------------------------------- lire un manifeste
    // alderia-manifeste 1
    // version 10
    // nom Chapitre 11 : ...
    // app-min 1
    // f <sha256> <taille> <chemin>
    public static Manifeste lire(InputStream in) throws IOException, Echec {
        BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"));
        Manifeste m = new Manifeste(); String l = r.readLine();
        if (l != null && l.startsWith("\uFEFF")) l = l.substring(1);
        if (l == null || !l.trim().equals("alderia-manifeste 1")) throw new Echec("Ce fichier n'est pas une mise à jour d'Aldéria.");
        boolean vu = false;
        while ((l = r.readLine()) != null) {
            l = l.trim(); if (l.length() == 0 || l.startsWith("#")) continue;
            try {
                if (l.startsWith("version ")) { m.version = Integer.parseInt(l.substring(8).trim()); vu = true; }
                else if (l.startsWith("nom ")) m.nom = l.substring(4).trim();
                else if (l.startsWith("app-min ")) m.appMin = Integer.parseInt(l.substring(8).trim());
                else if (l.startsWith("f ")) {
                    String[] p = l.split(" ", 4);
                    if (p.length != 4 || !p[1].matches("[0-9a-f]{64}") || !sur(p[3])) throw new Echec("Mise à jour abîmée (ligne refusée).");
                    m.fichiers.put(p[3], new Fichier(p[1], Long.parseLong(p[2])));
                }
            } catch (NumberFormatException e) { throw new Echec("Mise à jour abîmée (nombre illisible)."); }
        }
        if (!vu || m.fichiers.isEmpty() || !m.fichiers.containsKey("index.html")) throw new Echec("Mise à jour abîmée (manifeste incomplet).");
        return m;
    }

    /** Un chemin de fichier acceptable : lettres, chiffres, tirets, points, dossiers ; jamais « .. » ni chemin absolu. */
    static boolean sur(String c) {
        if (c.length() == 0 || c.length() > 200 || !c.matches("[A-Za-z0-9_][A-Za-z0-9_./-]*") || c.contains("//") || c.endsWith("/")) return false;
        for (String s : c.split("/")) if (s.equals("..") || s.equals(".")) return false;
        return true;
    }

    // ---------------------------------------------------------------- installer
    /** D'où viennent les fichiers d'une mise à jour. essais : combien de fois redemander un fichier coupé en route (réseau : 4 ; fichier zip : 1). */
    private static abstract class Fournisseur { abstract InputStream ouvrir(String chemin, Fichier f) throws IOException; int essais() { return 4; } }

    private void verifierVersion(Manifeste n) throws Echec {
        if (n.appMin > codeAppli) throw new Echec("Cette mise à jour demande une application plus récente. Installez d'abord le nouveau fichier APK.");
        if (n.version <= actif.version) throw new Echec(n.version == actif.version ? "Le jeu est déjà à jour (version " + actif.version + ")." : "Cette mise à jour (version " + n.version + ") est plus ancienne que le jeu installé (version " + actif.version + ").");
    }

    private synchronized void installer(Manifeste n, Fournisseur src, Suivi suivi) throws IOException, Echec {
        verifierVersion(n);
        effacer(tmp);
        long total = 0, fait = 0;
        for (Map.Entry<String, Fichier> e : n.fichiers.entrySet()) { Fichier b = base.fichiers.get(e.getKey()); if (b == null || !b.empreinte.equals(e.getValue().empreinte)) total += e.getValue().taille; }
        try {
            byte[] bloc = new byte[65536];
            for (Map.Entry<String, Fichier> e : n.fichiers.entrySet()) {
                String chemin = e.getKey(); Fichier f = e.getValue(), b = base.fichiers.get(chemin);
                if (b != null && b.empreinte.equals(f.empreinte)) continue;                       // déjà dans l'application
                File but = new File(tmp, "f/" + chemin); File parent = but.getParentFile();
                if (!parent.isDirectory() && !parent.mkdirs()) throw new IOException("dossier impossible à créer");
                Fichier a = actif != base ? actif.fichiers.get(chemin) : null;
                File deja = new File(dossier, "f/" + chemin);
                boolean recu = a != null && a.empreinte.equals(f.empreinte) && deja.isFile();     // déjà reçu lors d'une mise à jour précédente
                for (int essai = 0; ; essai++) {                                                  // un fichier coupé en route est redemandé
                    long n0 = 0; MessageDigest md = empreinte();
                    try {
                        InputStream in = recu ? new FileInputStream(deja) : src.ouvrir(chemin, f);
                        if (in == null) throw new Echec("Mise à jour incomplète : il manque « " + chemin + " ».");
                        try {
                            OutputStream out = new FileOutputStream(but);
                            try { int k; while ((k = in.read(bloc)) > 0) { out.write(bloc, 0, k); md.update(bloc, 0, k); n0 += k; if (n0 > f.taille) break; if (suivi != null) suivi.etape("Installation…", total > 0 ? Math.min(1, (fait + n0) / (double) total) : -1); } }
                            finally { out.close(); }
                        } finally { in.close(); }
                        if (n0 != f.taille || !hexa(md.digest()).equals(f.empreinte)) throw new IOException("empreinte");
                        fait += n0; break;
                    } catch (IOException ex) {
                        if (essai >= src.essais() - 1) { if ("empreinte".equals(ex.getMessage())) throw new Echec("Mise à jour abîmée : « " + chemin + " » ne correspond pas. Rien n'a été changé."); throw ex; }
                        if (recu) recu = false; else try { Thread.sleep(600 + essai * 900); } catch (InterruptedException x) { throw ex; }
                    }
                }
            }
            // le manifeste, puis l'échange des dossiers
            OutputStream out = new FileOutputStream(new File(creer(tmp), MANIFESTE));
            try { out.write(ecrire(n).getBytes("UTF-8")); } finally { out.close(); }
            effacer(ancien);
            if (dossier.exists() && !dossier.renameTo(ancien)) throw new IOException("échange des dossiers impossible");
            if (!tmp.renameTo(dossier)) { ancien.renameTo(dossier); throw new IOException("échange des dossiers impossible"); }
            effacer(ancien);
            actif = n;
        } catch (IOException e) { effacer(tmp); throw e; } catch (Echec e) { effacer(tmp); throw e; }
    }

    private static File creer(File d) throws IOException { if (!d.isDirectory() && !d.mkdirs()) throw new IOException("dossier impossible à créer"); return d; }

    public static String ecrire(Manifeste m) {
        StringBuilder s = new StringBuilder("alderia-manifeste 1\nversion " + m.version + "\nnom " + m.nom + "\napp-min " + m.appMin + "\n");
        for (Map.Entry<String, Fichier> e : m.fichiers.entrySet()) s.append("f ").append(e.getValue().empreinte).append(' ').append(e.getValue().taille).append(' ').append(e.getKey()).append('\n');
        return s.toString();
    }

    /** Installe une mise à jour reçue en fichier .zip (manifeste.txt et les fichiers changés). Renvoie le manifeste posé. */
    public Manifeste depuisZip(File zip, Suivi suivi) throws IOException, Echec {
        final ZipFile z;
        try { z = new ZipFile(zip); } catch (IOException e) { throw new Echec("Ce fichier n'est pas une mise à jour d'Aldéria (ce n'est pas un fichier .zip lisible)."); }
        try {
            ZipEntry em = z.getEntry(MANIFESTE);
            if (em == null) { for (Enumeration<? extends ZipEntry> en = z.entries(); en.hasMoreElements();) { ZipEntry x = en.nextElement(); if (x.getName().endsWith("/" + MANIFESTE)) throw new Echec("Mise à jour mal rangée : le manifeste doit être à la racine du fichier .zip."); } throw new Echec("Ce fichier .zip n'est pas une mise à jour d'Aldéria."); }
            Manifeste n; InputStream in = z.getInputStream(em); try { n = lire(in); } finally { in.close(); }
            installer(n, new Fournisseur() { InputStream ouvrir(String chemin, Fichier f) throws IOException { ZipEntry e = z.getEntry(chemin); return e == null ? null : z.getInputStream(e); } int essais() { return 1; } }, suivi);
            return n;
        } finally { z.close(); }
    }

    /** Cherche une mise à jour à l'adresse donnée (un dossier en ligne : manifeste.txt et les fichiers). Renvoie null si le jeu est déjà à jour. */
    public Manifeste enLigne(String adresse, Suivi suivi) throws IOException, Echec {
        final String racine = adresse.endsWith("/") ? adresse : adresse + "/";
        if (suivi != null) suivi.etape("Recherche d'une mise à jour…", -1);
        Manifeste n; InputStream in = telecharger(racine + MANIFESTE + "?t=" + System.currentTimeMillis());
        try { n = lire(in); } finally { in.close(); }
        synchronized (this) { if (n.version <= actif.version) return null; }
        installer(n, new Fournisseur() { InputStream ouvrir(String chemin, Fichier f) throws IOException { return telecharger(racine + chemin + "?e=" + f.empreinte.substring(0, 12)); } }, suivi == null ? null : new Suivi() { public void etape(String t, double p) { suivi.etape("Téléchargement…", p); } });
        return n;
    }

    /** Y a-t-il en ligne une version plus récente du jeu ? On ne lit que le manifeste : rien n'est téléchargé ni installé. Null si le jeu est à jour. */
    public Manifeste annonce(String adresse) throws IOException, Echec {
        final String racine = adresse.endsWith("/") ? adresse : adresse + "/";
        Manifeste n; InputStream in = telecharger(racine + MANIFESTE + "?t=" + System.currentTimeMillis());
        try { n = lire(in); } finally { in.close(); }
        synchronized (this) { return n.version > actif.version ? n : null; }
    }

    /** L'annonce d'une nouvelle application, déposée à côté du manifeste (application.txt : « code N », « nom X », « lien https://… »).
     *  Renvoie { code, nom, lien }, ou null s'il n'y a pas d'annonce. */
    public static String[] application(String adresse) throws IOException {
        final String racine = adresse.endsWith("/") ? adresse : adresse + "/";
        InputStream in;
        try { in = telecharger(racine + "application.txt?t=" + System.currentTimeMillis()); } catch (java.io.FileNotFoundException e) { return null; }
        try {
            BufferedReader r = new BufferedReader(new InputStreamReader(in, "UTF-8"));
            String[] p = { "", "", "" }; String l; int lignes = 0;
            while ((l = r.readLine()) != null && lignes++ < 40) {
                l = l.trim(); if (l.startsWith("\uFEFF")) l = l.substring(1);
                if (l.startsWith("code ")) p[0] = l.substring(5).trim();
                else if (l.startsWith("nom ")) p[1] = l.substring(4).trim();
                else if (l.startsWith("lien ")) p[2] = l.substring(5).trim();
            }
            return p[0].matches("\\d{1,9}") ? p : null;
        } finally { in.close(); }
    }

    private static InputStream telecharger(String adresse) throws IOException {
        IOException derniere = null;
        for (int essai = 0; essai < 4; essai++) {                                             // une connexion qui coupe : on redemande
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(adresse).openConnection();
                c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setUseCaches(false); c.setInstanceFollowRedirects(true);
                int code = c.getResponseCode();
                if (code == 200) return c.getInputStream();
                c.disconnect();
                if (code == 404) throw new java.io.FileNotFoundException("introuvable en ligne : " + adresse);
                derniere = new IOException("réponse " + code);
            } catch (java.io.FileNotFoundException e) { throw e; } catch (IOException e) { derniere = e; }
            try { Thread.sleep(800 + essai * 1200); } catch (InterruptedException e) { break; }
        }
        throw derniere != null ? derniere : new IOException("téléchargement impossible");
    }

    /** Revient au jeu livré avec l'application (efface la mise à jour posée). */
    public synchronized void retablir() { effacer(dossier); effacer(tmp); actif = base; }

    // ---------------------------------------------------------------- outils
    private static MessageDigest empreinte() throws IOException { try { return MessageDigest.getInstance("SHA-256"); } catch (Exception e) { throw new IOException("SHA-256 absent"); } }
    static String hexa(byte[] b) { StringBuilder s = new StringBuilder(b.length * 2); for (byte x : b) { s.append(Character.forDigit((x >> 4) & 15, 16)).append(Character.forDigit(x & 15, 16)); } return s.toString(); }
    static void effacer(File f) { if (f == null || !f.exists()) return; File[] l = f.listFiles(); if (l != null) for (File x : l) effacer(x); f.delete(); }
}
