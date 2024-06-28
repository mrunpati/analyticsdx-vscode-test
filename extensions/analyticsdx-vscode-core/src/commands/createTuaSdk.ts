import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);

async function getOrgDetails(): Promise<any| undefined> {
    try {
        const { stdout } = await execAsync('sfdx force:org:display --json');
        const orgDetails = JSON.parse(stdout);
        return orgDetails;
    } catch (error) {
        console.error(`Error fetching Org details`, error);
        return undefined;
    }
}

async function getAccessToken(orgDetails: any): Promise<string | undefined> {
    try {
        const accessToken = orgDetails?.result?.accessToken;
        return accessToken;
    } catch (error) {
        console.error(`Error fetching Access Token`, error);
        return undefined;
    }
}

async function getOrgUrl(orgDetails: any): Promise<string | undefined> {
    try {
        const instanceUrl = orgDetails?.result?.instanceUrl;
        if (!instanceUrl) {
            return undefined;
        }
        const lightningUrl = instanceUrl.replace('my.pc-rnd.salesforce.com', 'lightning.pc-rnd.force.com');
        console.log('Lightning URL:', lightningUrl);
        return lightningUrl;
    } catch (error) {
        console.error(`Error fetching Org URL`, error);
        return undefined;
    }
}

export async function createTUASdk(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
        vscode.window.showErrorMessage('Please open a workspace folder first.');
        return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const baseFolder = path.join(rootPath, 'tua-sdk');
    const subfolders = ['components', 'embedded-sdk-client'];

    const structure: { [key: string]: string[] } = {
        'components': ['dashboard', 'visualization', 'metrics'],
        'embedded-sdk-client': ['embedded-sdk-client.html', 'embedded-sdk-client.js']
    };

    const orgDetails = await getOrgDetails();
    if (!orgDetails) {
        vscode.window.showErrorMessage('Logged in Org details could not be fetched.');
        return;
    }

    const accessToken = await getAccessToken(orgDetails);
    if (!accessToken) {
        vscode.window.showErrorMessage('Access Token could not be fetched.');
        return;
    }

    const orgUrl = await getOrgUrl(orgDetails);
    if (!orgUrl) {
        vscode.window.showErrorMessage('Org URL could not be fetched.');
        return;
    }

    const htmlContent = generateHTMLfileContent(accessToken, orgUrl);

    const jsContent = generateJSfileContent(accessToken, orgUrl);

    try {
        // Create the base folder
        if (!fs.existsSync(baseFolder)) {
            fs.mkdirSync(baseFolder);
        }

        // Create the subfolders and their contents
        subfolders.forEach(folder => {
            const folderPath = path.join(baseFolder, folder);
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }

            structure[folder].forEach(item => {
                const itemPath = path.join(folderPath, item);
                if (item.endsWith('.html')) {
                    if (!fs.existsSync(itemPath)) {
                        fs.writeFileSync(itemPath, htmlContent);
                    }
                } else if(item.endsWith('.js')){
                  if (!fs.existsSync(itemPath)) {
                    fs.writeFileSync(itemPath, jsContent);
                }
                }else {
                    if (!fs.existsSync(itemPath)) {
                        fs.mkdirSync(itemPath);
                    }
                }
            });
        });

        vscode.window.showInformationMessage('Folder structure created successfully.');
    } catch (err) {
        vscode.window.showErrorMessage('Error creating folder structure');
    }
}

function generateJSfileContent(accessToken: string, orgUrl: string): string {
    return `import { initializeSdk, AnalyticsDashboard } from 'https://concurdemo:5501/sdk-bundle-1.0.0.module.js';
async function main() {
    const config = {
        accessToken: '${accessToken}',
        orgUrl: '${orgUrl}'
    };

    await initializeSdk(config);
    console.log(initializeSdk, config);

    const analyticsDashboardSdkCompOne = new AnalyticsDashboard('analytics-dashboard-js');
    analyticsDashboardSdkCompOne.dashboardId = '0FKOK00000023sJ4AQ';
    analyticsDashboardSdkCompOne.height = "500";
    analyticsDashboardSdkCompOne.addToPage();
}

main();`;
}

function generateHTMLfileContent(accessToken: string | undefined, orgUrl: string | undefined): string {
    return `<!DOCTYPE html>
<html>
<head>
    <script type="module">
        import {initializeSdk, AnalyticsDashboard} from 'https://concurdemo:5501/sdk-bundle-1.0.0.module.js';
    
        const config = {
            accessToken: '${accessToken}',
            orgUrl: '${orgUrl}'
        };
    
        await initializeSdk(config);
        console.log(initializeSdk, config);
    </script>
</head>
<body>
    <div>
        <h2>Hello, from TUA Embedded SDK!</h2>
    </div>
    <hr />
    <div id="analytics-dashboard-js">
        <analytics-dashboard dashboardId="0FKOK00000023sJ4AQ"></analytics-dashboard>
    </div>
</body>
</html>`;
}

export function createTUASdkCommand(){
  return createTUASdk();
}
