// src/appwriteConfig.js
import { Client, Account, ID } from "appwrite";

export const client = new Client();

client
    .setEndpoint("https://fra.cloud.appwrite.io/v1") // Your Appwrite Endpoint
    .setProject("68372f2300214dde6e4f"); // Your Project ID

export const account = new Account(client);
export { ID }; // Export ID to use for unique user IDs
