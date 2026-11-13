# Privacy policy for Pattern Forge

Last updated: November 14, 2026

Pattern Forge does not collect, transmit, sell or share personal information or document content.

The plugin runs entirely inside Figma. Network access is disabled in its manifest (`"allowedDomains": ["none"]`), and it uses no analytics, advertising, accounts, cookies or external APIs.

The plugin stores two kinds of data, both inside Figma:

- **Pattern recipes.** Each generated frame keeps its settings (seed, palette, density, texture, labels, output size) as Figma plugin data, so you can select it later and keep editing. This stays in your Figma file. Deleting the frame deletes the recipe.
- **Your saved presets.** Presets you save are kept in Figma's `clientStorage` on your own device. They are never sent anywhere.

If a future version changes this behaviour, this policy will be updated before that version is published.

Questions: https://github.com/nurfarhad/pattern-forge/issues
