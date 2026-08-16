import fitz
import glob

pdf_files = glob.glob(r"D:\Aplli\Delaval\Doc Utilisée\*.pdf")
if not pdf_files:
    exit(1)

pdf_path = pdf_files[0]
doc = fitz.open(pdf_path)
text = ""
for page in doc:
    text += page.get_text()

with open("pdf_out.txt", "w", encoding="utf-8") as f:
    f.write(text)
