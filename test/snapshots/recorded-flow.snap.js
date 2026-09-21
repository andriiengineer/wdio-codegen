// test/snapshots/recorded-flow.snap.js
export const snapshot = `describe('Recorded flow', () => {
  it('should complete the flow', async () => {
    await browser.url('http://localhost:8765/fixture.html');
    await $('button=Submit').click();
    await $('aria/Email address').setValue('test@example.com');
    await $('[data-testid="login-btn"]').click();
  });
});
`;
