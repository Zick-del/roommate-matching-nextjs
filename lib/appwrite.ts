import { Client, Account, Databases, Query, ID, type Models } from "appwrite";

export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const COLLECTION_ID =
  process.env.NEXT_PUBLIC_PARTICIPANTS_COLLECTION_ID ?? "participants";

export type ParticipantDoc = Models.Document & {
  userId: string;
  surveyDone?: boolean;
  completedStep?: number;
  [key: string]: unknown;
};

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    return await account.get();
  } catch {
    return null;
  }
}

export async function getParticipantByUserId(
  userId: string
): Promise<ParticipantDoc | null> {
  const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
    Query.equal("userId", userId),
  ]);
  return (res.documents[0] as unknown as ParticipantDoc) ?? null;
}

export async function saveParticipantStep(
  userId: string,
  data: Record<string, unknown>
): Promise<Models.Document> {
  const existing = await getParticipantByUserId(userId);
  if (existing) {
    return databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      existing.$id,
      data
    );
  }
  return databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
    userId,
    ...data,
  });
}

export async function markSurveyDone(userId: string): Promise<Models.Document> {
  return saveParticipantStep(userId, { surveyDone: true });
}
