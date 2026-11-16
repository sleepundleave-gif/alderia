# planche.py sortie.jpg colonnes image… : colle plusieurs images en une planche
import sys
from PIL import Image
out, col, noms = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
im = [Image.open(n) for n in noms]; w, h = im[0].size
P = Image.new('RGB', (w * col, h * ((len(im) + col - 1) // col)))
for i, a in enumerate(im): P.paste(a.resize((w, h)), ((i % col) * w, (i // col) * h))
P.save(out, quality=80); print(P.size)
