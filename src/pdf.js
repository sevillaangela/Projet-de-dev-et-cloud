// Fabrique un PDF à partir d'un titre et d'un texte (police standard, accents français inclus).
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = { largeur: 595.28, hauteur: 841.89, marge: 56 };

export async function buildPdf({ title, text }) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const supportes = new Set(normal.getCharacterSet());

  // La police standard ne connaît pas tous les caractères (émojis, alphabets non latins) :
  // on remplace ceux qu'elle ne sait pas dessiner par « ? » plutôt que de faire échouer le PDF.
  const nettoyer = (chaine) =>
    Array.from(chaine.replace(/\t/g, '    ').replace(/\u00a0/g, ' '))
      .map((c) => (supportes.has(c.codePointAt(0)) ? c : '?'))
      .join('');

  const largeurMax = A4.largeur - 2 * A4.marge;

  // Coupe une ligne en lignes plus courtes, sans dépasser la largeur de la page.
  function couper(ligne, police, taille) {
    const sorties = [];
    let courante = '';
    for (const mot of ligne.split(' ')) {
      const essai = courante ? `${courante} ${mot}` : mot;
      if (police.widthOfTextAtSize(essai, taille) <= largeurMax) {
        courante = essai;
        continue;
      }
      if (courante) sorties.push(courante);
      let reste = mot;
      while (police.widthOfTextAtSize(reste, taille) > largeurMax) {
        let n = reste.length;
        while (n > 1 && police.widthOfTextAtSize(reste.slice(0, n), taille) > largeurMax) n--;
        sorties.push(reste.slice(0, n));
        reste = reste.slice(n);
      }
      courante = reste;
    }
    sorties.push(courante);
    return sorties;
  }

  let page = pdf.addPage([A4.largeur, A4.hauteur]);
  let y = A4.hauteur - A4.marge;

  function ecrire(chaine, police, taille, interligne) {
    if (y - interligne < A4.marge) {
      page = pdf.addPage([A4.largeur, A4.hauteur]);
      y = A4.hauteur - A4.marge;
    }
    page.drawText(chaine, { x: A4.marge, y: y - taille, size: taille, font: police, color: rgb(0.1, 0.1, 0.1) });
    y -= interligne;
  }

  const titre = nettoyer(String(title ?? 'Sans titre'));
  for (const l of couper(titre, gras, 18)) ecrire(l, gras, 18, 24);
  y -= 10;

  for (const paragraphe of nettoyer(String(text ?? '')).split(/\r?\n/)) {
    if (paragraphe.trim() === '') {
      y -= 8;
      continue;
    }
    for (const l of couper(paragraphe, normal, 11)) ecrire(l, normal, 11, 15);
  }

  pdf.setTitle(titre);
  pdf.setProducer('Journal collaboratif');
  return pdf.save();
}
