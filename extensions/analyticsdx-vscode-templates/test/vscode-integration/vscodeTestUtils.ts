/*
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { JSONPath, parseTree } from 'jsonc-parser';
import { posix as path } from 'path';
import * as tmp from 'tmp';
import * as vscode from 'vscode';
import { ExtensionType as TemplateExtensionType } from '../../src';
import { EXTENSION_ID } from '../../src/constants';
import { matchJsonNodeAtPattern } from '../../src/util/jsoncUtils';
import { waitFor } from '../testutils';

// the tests here open vscode against /test-assets/sfdx-simple,
// so all paths should be relative to that
export const waveTemplatesUriPath = path.join('force-app', 'main', 'default', 'waveTemplates');

export async function closeAllEditors(): Promise<void> {
  // async/await to get it as a real Promise
  return await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

export function waitForExtensionActive<T>(
  id: string,
  forceActive = true,
  pauseMs = 500,
  timeoutMs = 10000
): Promise<vscode.Extension<T>> {
  let didActivate = false;
  // wait upto 10s for the extension to activate
  return waitFor(
    () => {
      const ext = vscode.extensions.getExtension<T>(id);
      if (!ext) {
        throw new Error(`Failed to find extension ${id}`);
      }
      if (!ext.isActive && forceActive && !didActivate) {
        ext.activate();
        didActivate = true;
      }
      return ext;
    },
    ext => ext && ext.isActive,
    pauseMs,
    timeoutMs
  );
}

export function waitForTemplateExtensionActive(pauseMs?: number, timeoutMs?: number) {
  return waitForExtensionActive<TemplateExtensionType>(EXTENSION_ID, true, pauseMs, timeoutMs);
}

export function uriFromTestRoot(...paths: string[]): vscode.Uri {
  const root = vscode.workspace.workspaceFolders![0];
  if (paths && paths.length) {
    return root.uri.with({
      path: path.join(root.uri.path, ...paths)
    });
  }
  return root.uri;
}

export async function openFile(uri: vscode.Uri, show?: true): Promise<[vscode.TextDocument, vscode.TextEditor]>;
export async function openFile(uri: vscode.Uri, show: false): Promise<[vscode.TextDocument, undefined]>;
export async function openFile(
  uri: vscode.Uri,
  show: boolean
): Promise<[vscode.TextDocument, vscode.TextEditor | undefined]>;
export async function openFile(
  uri: vscode.Uri,
  show = true
): Promise<[vscode.TextDocument, vscode.TextEditor | undefined]> {
  const doc = await vscode.workspace.openTextDocument(uri);
  let editor: vscode.TextEditor | undefined;
  if (show) {
    // we need to give a column to have multiple editor open, otherwise it will always replace an active editor
    // (by closing the active editor)
    // TODO: figure out why this won't open a 2nd doc in a tab in the active column
    editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  }
  return [doc, editor];
}

export function openTemplateInfo(
  relDirOrUri: string | vscode.Uri,
  show?: true
): Promise<[vscode.TextDocument, vscode.TextEditor]>;
export function openTemplateInfo(
  relDirOrUri: string | vscode.Uri,
  show: false
): Promise<[vscode.TextDocument, undefined]>;
export function openTemplateInfo(
  relDirOrUri: string | vscode.Uri,
  show: boolean
): Promise<[vscode.TextDocument, vscode.TextEditor | undefined]>;
export function openTemplateInfo(
  relDirOrUri: string | vscode.Uri,
  show = true
): Promise<[vscode.TextDocument, vscode.TextEditor | undefined]> {
  const uri =
    typeof relDirOrUri === 'string'
      ? uriFromTestRoot(waveTemplatesUriPath, relDirOrUri, 'template-info.json')
      : relDirOrUri;
  return openFile(uri, show);
}

export async function openFileAndWaitForDiagnostics(
  uri: vscode.Uri,
  show?: true,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, vscode.TextEditor]>;
export async function openFileAndWaitForDiagnostics(
  uri: vscode.Uri,
  show: false,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, undefined]>;
export async function openFileAndWaitForDiagnostics(
  uri: vscode.Uri,
  show: boolean,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, vscode.TextEditor | undefined]>;
export async function openFileAndWaitForDiagnostics(
  uri: vscode.Uri,
  show = true,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, vscode.TextEditor | undefined]> {
  const [doc, editor] = await openTemplateInfo(uri);
  return [await waitForDiagnostics(doc.uri, filter), doc, editor];
}

export async function openTemplateInfoAndWaitForDiagnostics(
  relDirOrUri: string | vscode.Uri,
  show?: true,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, vscode.TextEditor]>;
export async function openTemplateInfoAndWaitForDiagnostics(
  relDirOrUri: string | vscode.Uri,
  show: false,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, undefined]>;
export async function openTemplateInfoAndWaitForDiagnostics(
  relDirOrUri: string | vscode.Uri,
  show: boolean,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, vscode.TextEditor | undefined]>;
export async function openTemplateInfoAndWaitForDiagnostics(
  relDirOrUri: string | vscode.Uri,
  show = true,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<[vscode.Diagnostic[], vscode.TextDocument, vscode.TextEditor | undefined]> {
  const [doc, editor] = await openTemplateInfo(relDirOrUri, show);
  return [await waitForDiagnostics(doc.uri, filter), doc, editor];
}

const defDiagnosticFilter = (d: vscode.Diagnostic[] | undefined) => d && d.length > 0;
export async function waitForDiagnostics(
  uri: vscode.Uri,
  filter?: (d: vscode.Diagnostic[] | undefined) => boolean | undefined
): Promise<vscode.Diagnostic[]> {
  await vscode.commands.executeCommand('workbench.action.problems.focus');
  return waitFor(() => vscode.languages.getDiagnostics(uri), filter || defDiagnosticFilter);
}

/** Create a temporary directory in waveTemplates/ and an empty template-info.json.
 * @param open true to open the template-info.json file
 * @param show true to open the editor on the template-info.json (if open == true)
 * @param subdir optional sub directories paths under the temp directory, in which to create the template
 * @return the temp directory, and the document (if open == true) and the editor (if show == true).
 */
export async function createTempTemplate(
  open: boolean,
  show = true,
  ...subdirs: string[]
): Promise<[vscode.Uri, vscode.TextDocument | undefined, vscode.TextEditor | undefined]> {
  const basedir = uriFromTestRoot(waveTemplatesUriPath);
  // Note: this prefix here is coordinated with the .gitignore in
  // /test-assets/sfdx-simple/force-app/main/default/waveTemplates so that
  // we don't accidently check in temp test files.
  // If you change this base name here, be sure to change that .gitignore
  const dir = await new Promise<vscode.Uri>((resolve, reject) => {
    tmp.tmpName({ dir: basedir.fsPath, prefix: 'test-template-' }, (err, tmppath) => {
      if (err) {
        reject(err);
      }
      resolve(basedir.with({ path: tmppath }));
    });
  });
  await vscode.workspace.fs.createDirectory(dir);
  let templateDir = dir;
  if (subdirs && subdirs.length) {
    for (const subdir of subdirs) {
      templateDir = templateDir.with({ path: path.join(templateDir.path, subdir) });
      await vscode.workspace.fs.createDirectory(templateDir);
    }
  }
  const file = templateDir.with({ path: path.join(templateDir.path, 'template-info.json') });
  // write {} into the file directly
  await writeEmptyJsonFile(file);
  if (!open) {
    return [dir, undefined, undefined];
  }
  const [doc, editor] = await openTemplateInfo(dir, show);
  return [dir, doc, editor];
}

export function writeEmptyJsonFile(file: vscode.Uri): Thenable<void> {
  return vscode.workspace.fs.writeFile(file, Uint8Array.from([123, 125]));
}

export function findPositionByJsonPath(doc: vscode.TextDocument, path: JSONPath): vscode.Position | undefined {
  const root = parseTree(doc.getText());
  const node = matchJsonNodeAtPattern(root, path);
  if (node) {
    return doc.positionAt(node.offset);
  }
  return undefined;
}

export function getWholeDocumentRange(document: vscode.TextDocument): vscode.Range {
  const end = document.lineAt(document.lineCount - 1).range.end;
  return new vscode.Range(new vscode.Position(0, 0), end);
}

export async function setDocumentText(editor: vscode.TextEditor, text: string): Promise<void> {
  const result = await editor.edit(edit => {
    const range = getWholeDocumentRange(editor.document);
    edit.replace(range, text);
  });
  if (!result) {
    expect.fail('Failed to set text for ' + editor.document.uri.toString());
  }
}

export async function getCompletionItems(uri: vscode.Uri, position: vscode.Position): Promise<vscode.CompletionList> {
  const result = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider',
    uri,
    position
  );
  if (!result) {
    expect.fail('Expected vscode.CompletionList, got undefined');
  }
  return result!;
}
