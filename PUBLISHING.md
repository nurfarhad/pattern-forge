# Publishing Pattern Forge

## 1. Test it once in Figma desktop

1. Open any Figma Design file.
2. Go to **Plugins → Development → Import plugin from manifest…** and select `manifest.json` in this folder.
3. Run it with nothing selected, then click **Forge**. A pattern frame appears.
4. Draw a star, select it, switch to **Fill Selection** and forge. The pattern follows the star's outline.
5. Select a forged frame and move a slider. The frame updates in place.
6. Save a preset, close the plugin, reopen it, and check the preset is still there.

`dist/` is already built. You only need to rebuild (`npm install` then `npm run build`) if you change the source code.

## 2. Get the permanent plugin ID

The `id` in `manifest.json` is a placeholder. When you publish, Figma asks for a real ID:

1. Go to **Plugins → Development → New plugin…**, choose **Figma design** and **Custom UI**, and save it anywhere.
2. Open the new folder's `manifest.json` and copy its numeric `id`.
3. Paste that number into this folder's `manifest.json`, replacing `pattern-forge-brand-generator`.
4. Delete the temporary plugin folder and re-import this manifest.

Keep that ID forever. Every future update uses it.

## 3. Publish

1. Turn on two-factor authentication on your Figma account (required to publish).
2. Go to **Plugins → Manage plugins**, find Pattern Forge, open the **…** menu, choose **Publish**.
3. Copy every field from `community/LISTING.md`.
4. Upload the icon and the 5 images from `assets/` in the order listed there.
5. Security disclosure: answer that the plugin has **no network access** and **does not collect data** (see `PRIVACY.md`).
6. Click **Publish**. Figma reviews it and emails you, usually within a few business days.

## 4. After approval

- Updates no longer need review. Use **Publish new version** for code changes.
- To change only the text or images, untick **Publish a new version**.
- Never unpublish. That wipes the listing details.
