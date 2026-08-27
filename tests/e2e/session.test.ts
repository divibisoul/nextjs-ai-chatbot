import { expect, test } from '../fixtures';
import { AuthPage } from '../pages/auth';
import { generateRandomTestUser } from '../helpers';
import { ChatPage } from '../pages/chat';
import { getMessageByErrorCode } from '@/lib/errors';

test.describe.serial('Guest Session', () => {
  test('Authenticate as guest user when a new session is loaded', async ({ page }) => {
    const response = await page.goto('/');
    if (!response) throw new Error('Failed to load page');
    let request = response.request(); const chain: string[] = [];
    while (request) { chain.unshift(request.url()); const previous = request.redirectedFrom(); if (!previous) break; request = previous; }
    expect(chain).toEqual(['http://localhost:3000/','http://localhost:3000/api/auth/guest?redirectUrl=http%3A%2F%2Flocalhost%3A3000%2F','http://localhost:3000/']);
  });
  test('Log out is not available for guest users', async ({ page }) => { await page.goto('/'); await page.getByTestId('sidebar-toggle-button').click(); await page.getByTestId('user-nav-button').click(); await expect(page.getByTestId('user-nav-menu')).toBeVisible(); await expect(page.getByTestId('user-nav-item-auth')).toContainText('Login to your account'); });
  test('Do not authenticate as guest user when an existing non-guest session is active', async ({ adaContext }) => { const response=await adaContext.page.goto('/'); if(!response)throw new Error('Failed to load page'); let request=response.request(); const chain:string[]=[]; while(request){chain.unshift(request.url());const previous=request.redirectedFrom();if(!previous)break;request=previous;} expect(chain).toEqual(['http://localhost:3000/']); });
  test('Allow navigating to /login as guest user', async ({ page }) => { await page.goto('/login'); await page.waitForURL('/login'); await expect(page).toHaveURL('/login'); });
  test('Allow navigating to /register as guest user', async ({ page }) => { await page.goto('/register'); await page.waitForURL('/register'); await expect(page).toHaveURL('/register'); });
  test('Do not show email in user menu for guest user', async ({ page }) => { await page.goto('/'); await page.getByTestId('sidebar-toggle-button').click(); await expect(page.getByTestId('user-email')).toContainText('Guest'); });
});

test.describe.serial('Login and Registration', () => {
  let authPage: AuthPage; const testUser=generateRandomTestUser();
  test.beforeEach(async ({ page }) => { authPage=new AuthPage(page); });
  test('Register new account', async () => { await authPage.register(testUser.email,testUser.password); await authPage.expectToastToContain('Account created successfully!'); });
  test('Register new account with existing email', async () => { await authPage.register(testUser.email,testUser.password); await authPage.expectToastToContain('Account already exists!'); });
  test('Log into account that exists', async ({ page }) => { await authPage.login(testUser.email,testUser.password); await page.waitForURL('/'); await expect(page.getByPlaceholder('Send a message...')).toBeVisible(); });
  test('Display user email in user menu', async ({ page }) => { await authPage.login(testUser.email,testUser.password); await page.waitForURL('/'); await expect(page.getByPlaceholder('Send a message...')).toBeVisible(); await expect(page.getByTestId('user-email')).toHaveText(testUser.email); });
  test('Log out as non-guest user', async () => { await authPage.logout(testUser.email,testUser.password); });
  test('Do not force create a guest session if non-guest session already exists', async ({ page }) => { await authPage.login(testUser.email,testUser.password); await page.waitForURL('/'); await expect(page.getByTestId('user-email')).toHaveText(testUser.email); await page.goto('/api/auth/guest'); await page.waitForURL('/'); await expect(page.getByTestId('user-email')).toHaveText(testUser.email); });
  test('Log out is available for non-guest users', async ({ page }) => { await authPage.login(testUser.email,testUser.password); await page.waitForURL('/'); authPage.openSidebar(); await page.getByTestId('user-nav-button').click(); await expect(page.getByTestId('user-nav-menu')).toBeVisible(); await expect(page.getByTestId('user-nav-item-auth')).toContainText('Sign out'); });
  test('Do not navigate to /register for non-guest users', async ({ page }) => { await authPage.login(testUser.email,testUser.password); await page.waitForURL('/'); await page.goto('/register'); await expect(page).toHaveURL('/'); });
  test('Do not navigate to /login for non-guest users', async ({ page }) => { await authPage.login(testUser.email,testUser.password); await page.waitForURL('/'); await page.goto('/login'); await expect(page).toHaveURL('/'); });
});

test.describe('Entitlements', () => { let chatPage:ChatPage; test.beforeEach(async ({page})=>{chatPage=new ChatPage(page);}); test('Guest user cannot send more than 20 messages/day',async()=>{test.fixme(); await chatPage.createNewChat(); for(let i=0;i<=20;i++){await chatPage.sendUserMessage('Why is the sky blue?');await chatPage.isGenerationComplete();} await chatPage.sendUserMessage('Why is the sky blue?'); await chatPage.expectToastToContain(getMessageByErrorCode('rate_limit:chat'));}); });
