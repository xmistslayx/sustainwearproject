SustainWear Project – Setup & Installation Guide

This document explains how to get the SustainWear web app running on your local machine.
It includes Firebase setup, emulator usage, and dependencies required for testing and development.

1. Prerequisites

Before starting, make sure you have the following installed:

1. Node.js (v18 or newer)

Download: https://nodejs.org/

Verify installation:

node -v
npm -v


2. Firebase CLI (firebase-tools)

Install globally via npm:

npm install -g firebase-tools


Verify installation:

firebase --version


3. Git (for version control)

Download: https://git-scm.com/downloads

Verify installation:

git --version


4. Java (JDK 21+) – required for Firebase emulators

Download: https://adoptium.net/

Verify installation:

java -version

2. Clone the Project

If using GitHub:

git clone <repository_url>
cd sustainwear


If shared as a .zip file:

Extract the contents.

Open the folder in VS Code or your preferred IDE.

3. Install Dependencies

Run this command:

npm install


If there’s no package.json, skip this step (Firebase tools handle hosting).

4. Firebase Setup

Each member needs to set up Firebase locally.

1. Log in to Firebase:

firebase login


2. Initialize Firebase (only needed once per new environment):

firebase init


Select:

Hosting

Firestore

Auth

Storage

Then choose “Use existing project” and select sustainwear-11b25.

Do not overwrite existing files like firebase.json, .firebaserc, or firestore.rules.

5. Folder Structure Overview

Ensure your folder structure looks like this:

sustainwear/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
├── .gitignore
│
├── public/
│   ├── index.html
│   ├── donate.html
│   ├── style.css
│   ├── 404.html
│   ├── js/
│   │   ├── app.js
│   │   └── firebaseConfig.js
│
└── storage.rules

6. Firebase Configuration

The file firebaseConfig.js (inside /public/js/) contains:

export const firebaseConfig = {
  apiKey: "AIzaSyA6TqRHrs25U1_CcgeN-H4u33vRvUs8lsk",
  authDomain: "sustainwear-11b25.firebaseapp.com",
  projectId: "sustainwear-11b25",
  storageBucket: "sustainwear-11b25.appspot.com",
  messagingSenderId: "896353325055",
  appId: "1:896353325055:web:1e13edb9fa1e079d2521ca",
  measurementId: "G-NEJG7JR2D0"
};


No extra setup is required — just ensure this file is in /public/js/.

7. Running the Project Locally

To start the Firebase emulators:

firebase emulators:start


If ports are already in use:

firebase emulators:start --only hosting --port=5001


Then open your browser to:

http://localhost:5000


You should see the SustainWear home page and be able to sign in with Google (using local emulators).

8. Deploying to Firebase Hosting (Optional)

When ready to deploy:

firebase deploy


This will publish the website to:

https://sustainwear-11b25.web.app

9. Common Issues
Issue	Solution
Cannot access 'app' before initialization	Ensure initializeApp() is placed before any console logs.
CSS not loading	Confirm <link rel="stylesheet" href="style.css"> is the last link in the <head>.
Footer appears white	Press Ctrl + F5 (Windows) or Cmd + Shift + R (Mac) to hard-refresh the CSS.
Emulator fails to start	Try firebase emulators:start --only hosting.
Java version warning	Install JDK 21+ to avoid future compatibility issues.
10. Collaboration Notes

Do not push .env or sensitive data (these are ignored via .gitignore).

Always pull the latest version before committing new changes:

git pull
git add .
git commit -m "Updated feature"
git push


Only one group member needs to manage Firebase hosting deployment.

Keep commits clear and consistent (e.g., “Added donation form layout”).
