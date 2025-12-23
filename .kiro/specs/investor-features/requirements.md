# Requirements Document

## Introduction

This document outlines the requirements for new features requested by investors to enhance the quiz application. The features include support for quizzes without rewards, image attachments for quizzes and questions, share functionality after publishing, and admin panel improvements.

## Glossary

- **Quiz**: A set of questions with optional rewards that users can participate in
- **Reward Pool**: Token rewards distributed to quiz winners
- **Fun Quiz**: A quiz mode without any token rewards, fees, or stakes
- **Cover Image**: A thumbnail image displayed for the quiz in listings
- **Question Image**: An optional image attached to a specific question
- **Share Modal**: A popup allowing users to share quiz links via various platforms
- **Admin Panel**: Administrative interface for managing quizzes, polls, and users

## Requirements

### Requirement 1: Quiz Without Rewards Mode

**User Story:** As a quiz creator, I want to create quizzes without reward pools, so that I can use quizzes for onboarding, surveys, education, and community testing purposes.

#### Acceptance Criteria

1. WHEN a user toggles "Fun Quiz Mode" on the create quiz page THEN the System SHALL hide all reward pool, entry fee, and stake requirement sections
2. WHEN a fun quiz is displayed THEN the System SHALL show a message indicating "This quiz is for fun / knowledge only"
3. WHEN a user creates a fun quiz THEN the System SHALL skip all blockchain transactions and save directly to database
4. WHEN a fun quiz is listed THEN the System SHALL display a distinct visual indicator differentiating it from reward quizzes
5. WHEN a user joins a fun quiz THEN the System SHALL allow immediate participation without wallet connection requirement

### Requirement 2: Image Support for Quizzes

**User Story:** As a quiz creator, I want to add images to my quizzes and questions, so that I can create more engaging and visually appealing content.

#### Acceptance Criteria

1. WHEN a user creates a quiz THEN the System SHALL provide an option to upload a cover image
2. WHEN a user adds a question THEN the System SHALL provide an option to upload an image for that question
3. WHEN an image is uploaded THEN the System SHALL store it in Supabase Storage and return a public URL
4. WHEN a quiz with a cover image is displayed in listings THEN the System SHALL show the cover image as thumbnail
5. WHEN a question with an image is displayed during quiz play THEN the System SHALL render the image above the question text
6. WHEN an image upload fails THEN the System SHALL display an error message and allow retry

### Requirement 3: Share Functionality After Publishing

**User Story:** As a quiz creator, I want to share my quiz after publishing, so that I can easily distribute the quiz link to participants.

#### Acceptance Criteria

1. WHEN a quiz is successfully published THEN the System SHALL display a share modal with sharing options
2. WHEN user is in Farcaster mini app and clicks "Share to Farcaster" THEN the System SHALL use Farcaster SDK composeCast to create a cast with quiz link embedded
3. WHEN user is not in mini app and clicks "Share to Farcaster" THEN the System SHALL open Warpcast compose URL as fallback
4. WHEN a user clicks "Copy Link" THEN the System SHALL copy the quiz URL to clipboard and show confirmation
5. WHEN a user clicks "Share to Twitter" THEN the System SHALL open Twitter intent with pre-filled quiz link and title

### Requirement 4: Admin Panel Delete Functionality Fix

**User Story:** As an admin, I want the delete buttons to work correctly, so that I can manage and remove content from the platform.

#### Acceptance Criteria

1. WHEN an admin clicks delete on a quiz THEN the System SHALL remove the quiz and all associated data from the database
2. WHEN an admin clicks delete on a poll THEN the System SHALL remove the poll and all associated votes from the database
3. WHEN an admin clicks delete on a leaderboard entry THEN the System SHALL remove the entry from the database
4. WHEN a delete operation succeeds THEN the System SHALL refresh the list and show success confirmation
5. WHEN a delete operation fails THEN the System SHALL display an error message with the failure reason
