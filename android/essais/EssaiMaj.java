// Essai du moteur de mises à jour (Maj.java) sur l'ordinateur, sans téléphone :
//   sh essais/essai.sh
// Il fabrique un faux jeu, des mises à jour bonnes et mauvaises, et vérifie que le jeu installé n'est jamais abîmé.
import com.alderia.couronne.Maj;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;

public class EssaiMaj {
    static int fautes = 0, essais = 0;
    static void attendu(boolean ok, String quoi) { essais++; if (!ok) fautes++; System.out.println((ok ? "  ok     " : "  ERREUR ") + quoi); }
    static String sha(byte[] b) throws Exception { StringBuilder s = new StringBuilder(); for (byte x : MessageDigest.getInstance("SHA-256").digest(b)) s.append(String.format("%02x", x)); return s.toString(); }
    static byte[] o(String s) { return s.getBytes(StandardCharsets.UTF_8); }
    static String manifeste(int version, int appMin, Map<String, byte[]> f) throws Exception {
        StringBuilder s = new StringBuilder("alderia-manifeste 1\nversion " + version + "\nnom Essai " + version + "\napp-min " + appMin + "\n");
        for (Map.Entry<String, byte[]> e : f.entrySet()) s.append("f ").append(sha(e.getValue())).append(' ').append(e.getValue().length).append(' ').append(e.getKey()).append('\n');
        return s.toString();
    }
    static void poser(File d, Map<String, byte[]> f, String man) throws Exception {
        for (Map.Entry<String, byte[]> e : f.entrySet()) { File x = new File(d, e.getKey()); x.getParentFile().mkdirs(); Files.write(x.toPath(), e.getValue()); }
        Files.write(new File(d, "manifeste.txt").toPath(), o(man));
    }
    static File zip(File z, String man, Map<String, byte[]> f, String prefixe) throws Exception {
        try (ZipOutputStream out = new ZipOutputStream(new FileOutputStream(z))) {
            if (man != null) { out.putNextEntry(new ZipEntry(prefixe + "manifeste.txt")); out.write(o(man)); out.closeEntry(); }
            for (Map.Entry<String, byte[]> e : f.entrySet()) { out.putNextEntry(new ZipEntry(prefixe + e.getKey())); out.write(e.getValue()); out.closeEntry(); }
        }
        return z;
    }
    static Maj.Source source(final File d) { return new Maj.Source() { public InputStream ouvrir(String c) throws IOException { File f = new File(d, c); return f.isFile() ? new FileInputStream(f) : null; } }; }
    static String lire(Maj m, String c) throws Exception { InputStream in = m.ouvrir(c); if (in == null) return null; try { return new String(in.readAllBytes(), StandardCharsets.UTF_8); } finally { in.close(); } }
    static String refus(Maj m, File z) { try { m.depuisZip(z, null); return null; } catch (Maj.Echec e) { return e.getMessage(); } catch (IOException e) { return "IOException " + e.getMessage(); } }
    static int compter(File d) { if (!d.exists()) return 0; if (d.isFile()) return 1; int n = 0; File[] l = d.listFiles(); if (l != null) for (File x : l) n += compter(x); return n; }

    public static void main(String[] a) throws Exception {
        File r = Files.createTempDirectory("alderia-essai").toFile(), appli = new File(r, "appli"), pose = new File(r, "jeu");
        Map<String, byte[]> v10 = new LinkedHashMap<>();
        v10.put("index.html", o("<html>v10</html>")); v10.put("js/main.js", o("jeu v10")); v10.put("js/story.js", o("chapitres 1 à 10")); v10.put("modeles/paquet/a.bin", new byte[70000]);
        poser(appli, v10, manifeste(10, 0, v10));

        System.out.println("1. Jeu livré avec l'application");
        Maj m = new Maj(pose, source(appli), 1);
        attendu(m.actif().version == 10 && !m.miseAJourInstallee(), "version 10, aucune mise à jour posée");
        attendu("jeu v10".equals(lire(m, "js/main.js")) && lire(m, "js/absent.js") == null && lire(m, "../secret") == null, "fichiers lus dans l'application ; fichier absent ou chemin interdit refusé");

        System.out.println("2. Mise à jour 11 par fichier .zip : un fichier changé, un nouveau chapitre");
        Map<String, byte[]> v11 = new LinkedHashMap<>(v10); v11.put("js/main.js", o("jeu v11")); v11.put("js/story11.js", o("chapitre 11"));
        Map<String, byte[]> d11 = new LinkedHashMap<>(); d11.put("js/main.js", v11.get("js/main.js")); d11.put("js/story11.js", v11.get("js/story11.js"));
        final int[] pas = { 0 };
        m.depuisZip(zip(new File(r, "maj11.zip"), manifeste(11, 0, v11), d11, ""), new Maj.Suivi() { public void etape(String t, double p) { pas[0]++; } });
        attendu(m.actif().version == 11 && m.miseAJourInstallee(), "version 11 en vigueur");
        attendu("jeu v11".equals(lire(m, "js/main.js")) && "chapitre 11".equals(lire(m, "js/story11.js")), "fichier changé et nouveau chapitre lus dans la mise à jour");
        attendu("chapitres 1 à 10".equals(lire(m, "js/story.js")) && m.taille("modeles/paquet/a.bin") == 70000, "fichiers inchangés toujours lus dans l'application");
        attendu(compter(new File(pose, "f")) == 2, "seuls les 2 fichiers changés sont rangés (" + compter(new File(pose, "f")) + ")");
        attendu(pas[0] > 0, "la progression est annoncée");

        System.out.println("3. Le jeu est fermé puis rouvert");
        m = new Maj(pose, source(appli), 1);
        attendu(m.actif().version == 11 && "jeu v11".equals(lire(m, "js/main.js")), "la version 11 est toujours là");

        System.out.println("4. Mauvaises mises à jour : aucune ne doit toucher au jeu");
        Map<String, byte[]> v12 = new LinkedHashMap<>(v11); v12.put("js/main.js", o("jeu v12")); v12.put("js/story12.js", o("chapitre 12"));
        Map<String, byte[]> d12 = new LinkedHashMap<>(); d12.put("js/main.js", v12.get("js/main.js")); d12.put("js/story11.js", v12.get("js/story11.js")); d12.put("js/story12.js", v12.get("js/story12.js"));
        Map<String, byte[]> abime = new LinkedHashMap<>(d12); abime.put("js/story12.js", o("chapitre 1X"));
        String e = refus(m, zip(new File(r, "abime.zip"), manifeste(12, 0, v12), abime, "")); attendu(e != null && e.contains("abîmée"), "fichier abîmé → " + e);
        Map<String, byte[]> manque = new LinkedHashMap<>(d12); manque.remove("js/story12.js");
        e = refus(m, zip(new File(r, "manque.zip"), manifeste(12, 0, v12), manque, "")); attendu(e != null && e.contains("incomplète"), "fichier manquant → " + e);
        File bon12 = zip(new File(r, "maj12.zip"), manifeste(12, 0, v12), d12, "");
        byte[] entier = Files.readAllBytes(bon12.toPath()); File coupe = new File(r, "coupe.zip"); Files.write(coupe.toPath(), Arrays.copyOf(entier, entier.length / 2));
        e = refus(m, coupe); attendu(e != null, "téléchargement coupé à la moitié → " + e);
        e = refus(m, zip(new File(r, "vieux.zip"), manifeste(9, 0, v10), new LinkedHashMap<String, byte[]>(), "")); attendu(e != null, "version plus ancienne → " + e);
        e = refus(m, zip(new File(r, "meme.zip"), manifeste(11, 0, v11), d11, "")); attendu(e != null, "même version → " + e);
        e = refus(m, zip(new File(r, "appmin.zip"), manifeste(12, 5, v12), d12, "")); attendu(e != null, "exige une application plus récente → " + e);
        e = refus(m, zip(new File(r, "sous.zip"), manifeste(12, 0, v12), d12, "dossier/")); attendu(e != null, "manifeste rangé dans un sous-dossier → " + e);
        e = refus(m, zip(new File(r, "autre.zip"), null, d12, "")); attendu(e != null, "zip quelconque → " + e);
        Files.write(new File(r, "texte.zip").toPath(), o("ceci n'est pas un zip")); e = refus(m, new File(r, "texte.zip")); attendu(e != null, "fichier qui n'est pas un zip → " + e);
        Map<String, byte[]> piege = new LinkedHashMap<>(v11); piege.put("../../dehors.txt", o("x"));
        e = refus(m, zip(new File(r, "piege.zip"), manifeste(12, 0, piege), new LinkedHashMap<String, byte[]>(), "")); attendu(e != null && !new File(r, "dehors.txt").exists(), "chemin qui sort du dossier → " + e);
        Map<String, byte[]> sansIndex = new LinkedHashMap<>(v11); sansIndex.remove("index.html");
        e = refus(m, zip(new File(r, "sansindex.zip"), manifeste(12, 0, sansIndex), new LinkedHashMap<String, byte[]>(), "")); attendu(e != null, "manifeste sans index.html → " + e);
        attendu(m.actif().version == 11 && "jeu v11".equals(lire(m, "js/main.js")) && "chapitre 11".equals(lire(m, "js/story11.js")), "après tous ces refus : toujours la version 11, intacte");
        attendu(!new File(r, "jeu.tmp").exists() && !new File(r, "jeu.ancien").exists(), "aucun reste de dossier provisoire");
        m = new Maj(pose, source(appli), 1); attendu(m.actif().version == 11, "et encore la version 11 après redémarrage");

        System.out.println("5. Mise à jour 12 par-dessus la 11 (zip sans le chapitre 11, déjà reçu)");
        Map<String, byte[]> d12b = new LinkedHashMap<>(d12); d12b.remove("js/story11.js");
        m.depuisZip(zip(new File(r, "maj12b.zip"), manifeste(12, 0, v12), d12b, ""), null);
        attendu(m.actif().version == 12 && "jeu v12".equals(lire(m, "js/main.js")) && "chapitre 11".equals(lire(m, "js/story11.js")) && "chapitre 12".equals(lire(m, "js/story12.js")), "version 12 : chapitre 11 repris de la mise à jour précédente, chapitre 12 ajouté");

        System.out.println("6. Échange de dossiers coupé (téléphone éteint au mauvais moment)");
        attendu(pose.renameTo(new File(r, "jeu.ancien")), "simulation : le dossier est resté sous son nom provisoire");
        m = new Maj(pose, source(appli), 1);
        attendu(m.actif().version == 12 && "chapitre 12".equals(lire(m, "js/story12.js")), "au redémarrage la version 12 est retrouvée");
        new File(pose, "f/js/story12.js").delete(); m = new Maj(pose, source(appli), 1);
        attendu(m.actif().version == 10 && "jeu v10".equals(lire(m, "js/main.js")) && !pose.exists(), "mise à jour posée incomplète (fichier effacé) → retour au jeu de l'application");

        System.out.println("7. En ligne (dossier servi par un petit serveur local)");
        String adresse = a.length > 0 ? a[0] : null;
        if (adresse != null) {
            File web = new File(a[1]); poser(web, v12, manifeste(12, 0, v12));
            Maj.Manifeste n = m.enLigne(adresse, null);
            attendu(n != null && m.actif().version == 12 && "chapitre 12".equals(lire(m, "js/story12.js")) && compter(new File(pose, "f")) == 3, "version 12 téléchargée : 3 fichiers changés seulement");
            attendu(m.enLigne(adresse, null) == null, "seconde recherche : déjà à jour");
            Map<String, byte[]> v13 = new LinkedHashMap<>(v12); v13.put("js/story13.js", o("chapitre 13")); poser(web, v13, manifeste(13, 0, v13));
            Files.write(new File(web, "js/story13.js").toPath(), o("chapitre 1X"));
            try { m.enLigne(adresse, null); attendu(false, "fichier en ligne abîmé accepté"); } catch (Maj.Echec x) { attendu(m.actif().version == 12, "fichier en ligne abîmé → " + x.getMessage()); }
            new File(web, "js/story13.js").delete();
            try { m.enLigne(adresse, null); attendu(false, "fichier en ligne manquant accepté"); } catch (Exception x) { attendu(m.actif().version == 12 && "chapitre 12".equals(lire(m, "js/story12.js")), "fichier en ligne manquant → " + x.getMessage()); }
            try { m.enLigne(adresse + "nulle-part/", null); attendu(false, "adresse fausse acceptée"); } catch (Exception x) { attendu(true, "adresse sans mise à jour → " + x.getMessage()); }
        } else System.out.println("  (non essayé : pas d'adresse)");

        System.out.println("8. Retirer la mise à jour, puis application plus récente que la mise à jour posée");
        m.retablir(); attendu(m.actif().version == 10 && !m.miseAJourInstallee() && "jeu v10".equals(lire(m, "js/main.js")), "retour au jeu de l'application");
        m.depuisZip(new File(r, "maj11.zip"), null); attendu(m.actif().version == 11, "version 11 reposée");
        File appli2 = new File(r, "appli2"); Map<String, byte[]> v14 = new LinkedHashMap<>(v12); v14.put("js/main.js", o("jeu v14")); poser(appli2, v14, manifeste(14, 0, v14));
        m = new Maj(pose, source(appli2), 2);
        attendu(m.actif().version == 14 && "jeu v14".equals(lire(m, "js/main.js")) && !pose.exists(), "nouvel APK en version 14 : l'ancienne mise à jour 11 est écartée et effacée");

        System.out.println(fautes == 0 ? "\nTOUT EST BON : " + essais + " vérifications" : "\n" + fautes + " ERREURS sur " + essais);
        System.exit(fautes == 0 ? 0 : 1);
    }
}
