/**
 * interaction.example.mjs
 * -----------------------
 * Example interaction script for capture.mjs.
 *
 * Export a single default async function that receives the Playwright `page`
 * and drives whatever showcase best demonstrates your prototype. The recording
 * is already running by the time this function is called, so everything you do
 * here (moves, clicks, typing, hovers, waits) is captured into the GIF.
 *
 * Run it with:
 *   node capture.mjs --file ./index.html --out ../gifs/demo.gif --script ./interaction.example.mjs
 *
 * Tips:
 *  - Use small `page.waitForTimeout(...)` pauses so viewers can follow the action.
 *  - Aim for the total runtime to land near your intended --duration.
 *  - Prefer `page.mouse.move(...)` for visible cursor motion (the cursor is
 *    recorded), and slow, deliberate steps over instant jumps.
 */

export default async function interaction(page) {
  // 1) Give the scene a beat to settle / initial animation to play.
  await page.waitForTimeout(600);

  // 2) Move the mouse to a control and hover to reveal any hover state.
  //    Replace the selector with something real in your prototype.
  const hoverTarget = page.locator('button, a, .control').first();
  if (await hoverTarget.count()) {
    const box = await hoverTarget.boundingBox();
    if (box) {
      // Move in a couple of steps so the cursor motion is visible.
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
      await page.waitForTimeout(500);
    }
  }

  // 3) Click a primary control to trigger the main feature.
  const primary = page.locator('button').first();
  if (await primary.count()) {
    await primary.click();
    await page.waitForTimeout(800);
  }

  // 4) Type into an input to show interactivity (if your prototype has one).
  const input = page.locator('input[type="text"], textarea').first();
  if (await input.count()) {
    await input.click();
    await input.fill(''); // clear first
    await input.type('hello world', { delay: 80 }); // per-keystroke delay reads well on video
    await page.waitForTimeout(600);
  }

  // 5) Demonstrate a drag or slider interaction (canvas / range input etc.).
  const slider = page.locator('input[type="range"]').first();
  if (await slider.count()) {
    const box = await slider.boundingBox();
    if (box) {
      // Drag the slider handle from left to right.
      await page.mouse.move(box.x + 4, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 30 });
      await page.mouse.up();
      await page.waitForTimeout(600);
    }
  }

  // 6) Optional: scroll to reveal more of the page before the loop ends.
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(700);

  // 7) Final hold so the GIF loop has a clean resting frame.
  await page.waitForTimeout(500);
}
