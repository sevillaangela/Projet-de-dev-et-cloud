// Envoi des e-mails d'invitation via Amazon SES.
import { SendEmailCommand } from '@aws-sdk/client-sesv2';

// Les en-têtes d'un e-mail ne doivent jamais contenir de saut de ligne.
const uneLigne = (s) => String(s).replace(/[\r\n]+/g, ' ');

export function createMailer(ses, from) {
  return {
    async sendInvitation({ to, inviterName, title, link }) {
      const corps =
        `Bonjour,\n\n${uneLigne(inviterName)} vous invite à écrire avec lui/elle « ${uneLigne(title)} ».\n\n` +
        `Ouvrir le document : ${link}\n\n` +
        `À la première visite, entrez votre nom et cette adresse e-mail (${to}) : c'est elle qui ouvre l'accès.\n`;
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: from,
          Destination: { ToAddresses: [to] },
          Content: {
            Simple: {
              Subject: { Data: uneLigne(`${inviterName} vous invite à écrire « ${title} »`), Charset: 'UTF-8' },
              Body: { Text: { Data: corps, Charset: 'UTF-8' } },
            },
          },
        }),
      );
    },
  };
}
