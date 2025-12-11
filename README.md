SustainWear – Project README

This document provides an overview of the SustainWear application, its purpose, how it is structured, and how it can be run for assessment purposes. It also outlines the major features delivered as part of the project.

1. Project Overview

SustainWear is a web-based platform designed to support sustainable clothing donation and redistribution. The system enables donors to submit clothing donations, charities to request stock, and administrators to oversee operations and approve requests.

The platform promotes circular fashion by connecting donors with local charities and tracking the environmental impact of donations.

2. Features Implemented
Donor Features

Submit donations containing multiple clothing items.

Enter and update personal and pickup information.

Automatically calculate CO₂ saved based on donated item categories.

Access a personal dashboard showing:

Total donations

Total items donated

CO₂ saved

Donation history with detailed modal view

Automatic pre-fill of donor details from stored Firestore data.

Charity Features

View available stock generated from completed donations.

Add items to a cart and submit stock requests.

Requests stored in Firestore, including requested items and submission dates.

Admin Features

Review all donations, including donor details and item information.

Approve or reject charity requests.

Update donation pickup statuses (pending, scheduled, completed, cancelled).

Dashboard includes:

Category-based donation chart

Pickup status chart

Summary metrics (donations, pickups, CO₂ totals)

Role-Based Navigation

Dynamic navigation showing only the pages relevant to the user’s role (Donor, Charity, Admin).

Roles determined by Firestore user records.

3. Technologies Used

HTML, CSS, JavaScript

Bootstrap 5

Firebase Authentication

Firestore Database

Firebase Hosting

Firebase Emulator Suite

EmailJS for donor confirmations

Chart.js for dashboard analytics

No traditional backend server is required due to Firebase's client-side SDK powering the application logic.

4. Running the Application (Local or Hosted)
Hosted Version

A live version is deployed and used for assessment.

Running Locally with Firebase Emulator

Install Firebase CLI:

npm install -g firebase-tools


Login:

firebase login


Start the emulator:

firebase emulators:start


Access the app:

http://localhost:5000

5. Deployment Instructions

To publish updates to Firebase Hosting:

firebase deploy


The site is then available at the assigned Firebase Hosting URL.

6. Testing Overview (Summary)

Testing completed includes:

Manual functional testing of all user flows (donor, charity, admin)

Non-functional performance testing (DevTools network timings)

Accessibility testing using Axe DevTools

Integration testing with Firebase Emulator Suite

A separate testing document contains detailed test cases, outcomes, screenshots, and defect logs.

7. Defect Log

A defect report is provided in the repository at:

/testing/defect-log.xlsx


It includes issue descriptions, severity, steps to reproduce, and resolutions.

8. Notes for Assessors

All main user stories were implemented.

Authentication and database interactions rely entirely on Firebase.

CO₂ calculations follow a simplified category-based model for clarity.

The originally planned AI feature was researched but not implemented to maintain project scope and stability.
