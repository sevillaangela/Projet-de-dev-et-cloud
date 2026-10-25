// Accès à DynamoDB. Chaque fonction correspond à UNE opération de la base.
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const conditionRefusee = (err) => err?.name === 'ConditionalCheckFailedException';

export function documentsRepo(db, table) {
  return {
    async get(docId, lectureCoherente = false) {
      const r = await db.send(
        new GetCommand({ TableName: table, Key: { docId }, ConsistentRead: lectureCoherente }),
      );
      return r.Item ?? null;
    },

    async create(item) {
      await db.send(
        new PutCommand({ TableName: table, Item: item, ConditionExpression: 'attribute_not_exists(docId)' }),
      );
    },

    // Remplace le texte, augmente le numéro de modification (seq) et note le contributeur,
    // le tout en une seule opération atomique. Temporaire : remplacé par Yjs au bloc 2.
    async setText(docId, text, user, maintenant) {
      try {
        const r = await db.send(
          new UpdateCommand({
            TableName: table,
            Key: { docId },
            UpdateExpression: 'SET #t = :t, #maj = :now, #contrib.#email = :nom ADD #seq :un',
            ConditionExpression: 'attribute_exists(docId)',
            ExpressionAttributeNames: {
              '#t': 'text',
              '#maj': 'updatedAt',
              '#contrib': 'contributors',
              '#email': user.email,
              '#seq': 'seq',
            },
            ExpressionAttributeValues: { ':t': text, ':now': maintenant, ':nom': user.name, ':un': 1 },
            ReturnValues: 'ALL_NEW',
          }),
        );
        return r.Attributes;
      } catch (err) {
        if (conditionRefusee(err)) return null;
        throw err;
      }
    },

    // Verrou de génération du PDF : une seule requête à la fois peut fabriquer le PDF.
    async acquirePdfLock(docId, jusquA, maintenant) {
      try {
        await db.send(
          new UpdateCommand({
            TableName: table,
            Key: { docId },
            UpdateExpression: 'SET #verrou = :jusqua',
            ConditionExpression: 'attribute_exists(docId) AND (attribute_not_exists(#verrou) OR #verrou < :now)',
            ExpressionAttributeNames: { '#verrou': 'pdfLockUntil' },
            ExpressionAttributeValues: { ':jusqua': jusquA, ':now': maintenant },
          }),
        );
        return true;
      } catch (err) {
        if (conditionRefusee(err)) return false;
        throw err;
      }
    },

    async releasePdfLock(docId) {
      await db.send(
        new UpdateCommand({
          TableName: table,
          Key: { docId },
          UpdateExpression: 'REMOVE #verrou',
          ExpressionAttributeNames: { '#verrou': 'pdfLockUntil' },
        }),
      );
    },

    // Note qu'un PDF existe pour cette version, sans jamais revenir en arrière.
    async markPdfReady(docId, seq) {
      try {
        await db.send(
          new UpdateCommand({
            TableName: table,
            Key: { docId },
            UpdateExpression: 'SET #pdf = :seq REMOVE #verrou',
            ConditionExpression: 'attribute_not_exists(#pdf) OR #pdf < :seq',
            ExpressionAttributeNames: { '#pdf': 'pdfSeq', '#verrou': 'pdfLockUntil' },
            ExpressionAttributeValues: { ':seq': seq },
          }),
        );
      } catch (err) {
        if (!conditionRefusee(err)) throw err;
        await this.releasePdfLock(docId); // un PDF plus récent existe déjà
      }
    },
  };
}

export function linksRepo(db, table) {
  return {
    async get(linkId) {
      const r = await db.send(new GetCommand({ TableName: table, Key: { linkId } }));
      return r.Item ?? null;
    },

    async create(item) {
      await db.send(
        new PutCommand({ TableName: table, Item: item, ConditionExpression: 'attribute_not_exists(linkId)' }),
      );
    },

    // LE point critique de la contrainte C1 : « retirer 1 SI il en reste », en une seule
    // opération indivisible. DynamoDB les traite une par une : jamais un exemplaire de trop.
    async consumeOne(linkId) {
      try {
        const r = await db.send(
          new UpdateCommand({
            TableName: table,
            Key: { linkId },
            UpdateExpression: 'SET #rest = #rest - :un',
            ConditionExpression: 'attribute_exists(linkId) AND #rest > :zero',
            ExpressionAttributeNames: { '#rest': 'remaining' },
            ExpressionAttributeValues: { ':un': 1, ':zero': 0 },
            ReturnValues: 'ALL_NEW',
          }),
        );
        return r.Attributes;
      } catch (err) {
        if (conditionRefusee(err)) return null;
        throw err;
      }
    },
  };
}
