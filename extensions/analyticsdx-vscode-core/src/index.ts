/*
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { commands, ExtensionContext, workspace } from 'vscode';
import { telemetryService } from './telemetry';

import {
  createBlankApp,
  createTemplate,
  deleteApp,
  deleteTemplate,
  openAppInStudio,
  openStudio,
  updateTemplate
} from './commands';

function sendTelemetryCommand(eventName: string, extensionName: string, properties?: Record<string, string>) {
  if (eventName && extensionName) {
    // Note: we're intentionally not waiting for this to finish
    telemetryService.sendTelemetryEvent(eventName, extensionName, properties).catch(console.error);
  }
}

export function activate(context: ExtensionContext) {
  const extensionHRStart = process.hrtime();

  // if we have no workspace folders, exit
  if (!workspace.workspaceFolders) {
    console.log('No workspace, exiting extension');
    return;
  }

  // register our commands, and set them up to cleanup correctly
  context.subscriptions.push(
    commands.registerCommand('analyticsdx.app.create.blank', createBlankApp),
    commands.registerCommand('analyticsdx.app.delete', deleteApp),
    commands.registerCommand('analyticsdx.studio.open', openStudio),
    commands.registerCommand('analyticsdx.studio.open.app', openAppInStudio),
    commands.registerCommand('analyticsdx.template.create', createTemplate),
    commands.registerCommand('analyticsdx.template.delete', deleteTemplate),
    commands.registerCommand('analyticsdx.template.update', updateTemplate),
    // Note: analyticsdx.telemetry.send is intentionally not listed in package.json; it's only for extension
    // code to call
    commands.registerCommand('analyticsdx.telemetry.send', sendTelemetryCommand)
  );

  console.log('Analytics DX CLI Extension Activated');
  // Notify telemetry that our extension is now active
  telemetryService.sendExtensionActivationEvent(extensionHRStart).catch();
}

export function deactivate() {
  console.log('Analytics DX CLI Extension Dectivated');
  telemetryService.sendExtensionDeactivationEvent().catch();
}
