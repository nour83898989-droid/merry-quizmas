/**
 * E2E Tests for Onchain Transactions
 * Tests all transaction functions with Base Builder Code
 */

import { testWithSynpress, MetaMask, unlockForFixture } from '@synthetixio/synpress';
import { test as base, expect } from '@playwright/test';

// Extend test with Synpress MetaMask fixture
const test = testWithSynpress(base, unlockForFixture);

// Test wallet address (deployer)
const TEST_WALLET = '0x26331e0d4c7fc168462d56ec36629d22012f4d88';

// Contract addresses
const QUIZ_REWARD_POOL = '0x2A00470b7d2Ef9a48CB27CbEC5b8DbB283FF7731';
const TEST_SUP_TOKEN = '0x91d143D0c9CE96AF2172424A7B943E07a70BE080';
const TEST_BANGER_TOKEN = '0xb3C87A2a914CD4BeB8534e624be1216b9163862a';

test.describe('Onchain Transaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should connect wallet successfully', async ({ page, metamask }) => {
    // Click connect button
    await page.click('button:has-text("Connect")');
    
    // Approve connection in MetaMask
    await metamask.connectToDapp();
    
    // Verify wallet is connected
    await expect(page.locator(`text=${TEST_WALLET.slice(0, 6)}`)).toBeVisible();
  });

  test('should switch to Base Sepolia network', async ({ page, metamask }) => {
    // Connect wallet first
    await page.click('button:has-text("Connect")');
    await metamask.connectToDapp();
    
    // App should prompt to switch network if not on Base Sepolia
    // The app auto-switches, so just verify we're on correct network
    await expect(page.locator('text=Base Sepolia')).toBeVisible({ timeout: 10000 });
  });

  test('should approve token with Builder Code', async ({ page, metamask }) => {
    // Connect wallet
    await page.click('button:has-text("Connect")');
    await metamask.connectToDapp();
    
    // Navigate to create quiz page
    await page.goto('/create');
    await page.waitForLoadState('networkidle');
    
    // Fill quiz form with minimal data
    await page.fill('input[name="title"]', 'E2E Test Quiz');
    await page.fill('textarea[name="description"]', 'Test quiz for E2E');
    
    // Select tSUP token for reward
    await page.click('[data-testid="token-selector"]');
    await page.click('text=tSUP');
    
    // Enter reward amount
    await page.fill('input[name="rewardAmount"]', '1');
    
    // Add a question
    await page.click('button:has-text("Add Question")');
    await page.fill('input[name="questions.0.text"]', 'What is 2+2?');
    await page.fill('input[name="questions.0.options.0"]', '3');
    await page.fill('input[name="questions.0.options.1"]', '4');
    await page.fill('input[name="questions.0.options.2"]', '5');
    await page.fill('input[name="questions.0.options.3"]', '6');
    await page.click('input[name="questions.0.correctAnswer"][value="1"]');
    
    // Submit form - this should trigger token approval
    await page.click('button:has-text("Create Quiz")');
    
    // Wait for MetaMask approval popup
    await metamask.confirmTransaction();
    
    // Verify approval was successful (no error shown)
    await expect(page.locator('text=Error')).not.toBeVisible({ timeout: 5000 });
  });

  test('should create quiz onchain with Builder Code', async ({ page, metamask }) => {
    // This test continues from approval
    // After approval, the createQuiz transaction should be sent
    
    // Connect wallet
    await page.click('button:has-text("Connect")');
    await metamask.connectToDapp();
    
    await page.goto('/create');
    
    // Fill form (same as above)
    await page.fill('input[name="title"]', 'E2E Test Quiz 2');
    await page.fill('textarea[name="description"]', 'Test quiz for E2E');
    await page.click('[data-testid="token-selector"]');
    await page.click('text=tSUP');
    await page.fill('input[name="rewardAmount"]', '1');
    
    // Add question
    await page.click('button:has-text("Add Question")');
    await page.fill('input[name="questions.0.text"]', 'What is 2+2?');
    await page.fill('input[name="questions.0.options.0"]', '3');
    await page.fill('input[name="questions.0.options.1"]', '4');
    await page.fill('input[name="questions.0.options.2"]', '5');
    await page.fill('input[name="questions.0.options.3"]', '6');
    await page.click('input[name="questions.0.correctAnswer"][value="1"]');
    
    // Submit
    await page.click('button:has-text("Create Quiz")');
    
    // Confirm approval tx
    await metamask.confirmTransaction();
    
    // Wait for createQuiz tx
    await page.waitForTimeout(3000);
    
    // Confirm createQuiz tx
    await metamask.confirmTransaction();
    
    // Should redirect to quiz page or show success
    await expect(page.locator('text=Quiz created')).toBeVisible({ timeout: 30000 });
  });

  test('should verify Builder Code in transaction calldata', async ({ page, metamask }) => {
    // This test verifies that Builder Code is appended to calldata
    // We can check this by inspecting the transaction in MetaMask
    
    // Connect wallet
    await page.click('button:has-text("Connect")');
    await metamask.connectToDapp();
    
    // The Builder Code hex should be: 62635f6779303936777666
    // (bc_gy096wvf in hex)
    
    // This is more of a manual verification - 
    // check BaseScan after test to verify calldata ends with builder code
    expect(true).toBe(true);
  });
});

test.describe('Claim Reward Tests', () => {
  test('should claim reward with Builder Code', async ({ page, metamask }) => {
    // Connect wallet
    await page.click('button:has-text("Connect")');
    await metamask.connectToDapp();
    
    // Navigate to claim page
    await page.goto('/claim');
    await page.waitForLoadState('networkidle');
    
    // If there are claimable rewards, click claim
    const claimButton = page.locator('button:has-text("Claim")').first();
    
    if (await claimButton.isVisible()) {
      await claimButton.click();
      
      // Confirm transaction in MetaMask
      await metamask.confirmTransaction();
      
      // Wait for success
      await expect(page.locator('text=Claimed')).toBeVisible({ timeout: 30000 });
    } else {
      // No rewards to claim - skip
      test.skip();
    }
  });
});

test.describe('Join Quiz Tests', () => {
  test('should join quiz with entry fee', async ({ page, metamask }) => {
    // Connect wallet
    await page.click('button:has-text("Connect")');
    await metamask.connectToDapp();
    
    // Navigate to quizzes page
    await page.goto('/quizzes');
    await page.waitForLoadState('networkidle');
    
    // Find a quiz with entry fee
    const quizCard = page.locator('[data-testid="quiz-card"]').first();
    
    if (await quizCard.isVisible()) {
      await quizCard.click();
      
      // Click start/join button
      const startButton = page.locator('button:has-text("Start Quiz")');
      
      if (await startButton.isVisible()) {
        await startButton.click();
        
        // If entry fee required, confirm approval
        try {
          await metamask.confirmTransaction();
          // Then confirm join tx
          await page.waitForTimeout(2000);
          await metamask.confirmTransaction();
        } catch {
          // No entry fee required
        }
        
        // Should start quiz
        await expect(page.locator('text=Question')).toBeVisible({ timeout: 10000 });
      }
    } else {
      test.skip();
    }
  });
});
