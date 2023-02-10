import { chromium } from 'playwright';

export function essRedirectFactory(username: string, password: string) {
  return async function handleRedirect(url: string) {
    // Visit the redirect url
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForURL(/https:\/\/auth.inrupt.com\/.*/);
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
  
    const button = page.getByRole('button', { name: 'Submit' });
    await button.hover();
    await button.click();
  
    const returnUrl = await new Promise(async res => {
      page.on('request', r => {
        if (r.url().startsWith('vscode')) {
          res(r.url());
        }
      })
  
      await page.click('button[form=approve]');
    });
  
    await page.close();
    await browser.close();
  
    return returnUrl;
  }
}
