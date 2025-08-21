


import { Client, Account, ID, Databases } from "appwrite";

const client = new Client();

client
    .setEndpoint("https://cloud.appwrite.io/v1")
    .setProject("68372f2300214dde6e4f");

const database = new Databases(client);
const account = new Account(client);

export { client, database, account, ID };
