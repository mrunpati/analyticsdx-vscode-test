/*
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Constants for icon strings for analytics objects.
// These should go into strings that are going to become vscode labels
// (i.e. quick pick items, status bar items)
export const ICONS = Object.freeze({
  // See https://code.visualstudio.com/api/references/icons-in-labels
  // for the set of available octicon names available for labels in vscode
  App: '$(home)',
  Template: '$(versions)'
});

// paths to things in salesforce ui
export const URI_PATHS = Object.freeze({
  Studio: '/analytics/wave/wave.apexp'
});
