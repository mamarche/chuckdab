import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as sql from 'mssql';

async function generatePocoClasses() {
    const options: vscode.OpenDialogOptions = {
        canSelectMany: false,
        openLabel: 'Select dab-config.json',
        filters: {
            'JSON files': ['json']
        }
    };

    const fileUri = await vscode.window.showOpenDialog(options);

    if (!fileUri || fileUri.length === 0) {
        vscode.window.showErrorMessage('No file selected.');
        return;
    }

    const configFilePath = fileUri[0].fsPath;
    if (!fs.existsSync(configFilePath)) {
        vscode.window.showErrorMessage('dab-config.json not found.');
        return;
    }

    const configContent = fs.readFileSync(configFilePath, 'utf-8');
    const config = JSON.parse(configContent);

    if (!config.entities) {
        vscode.window.showErrorMessage('No entities found in dab-config.json.');
        return;
    }

    const connectionString = await vscode.window.showInputBox({
        prompt: 'Enter the database connection string'
    });

    if (!connectionString) {
        vscode.window.showErrorMessage('No connection string provided.');
        return;
    }

    let pool: sql.ConnectionPool | null = null;

    try {
        
        pool = await sql.connect(connectionString);

        const folderOptions: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Select folder to save class',
            canSelectFolders: true,
            canSelectFiles: false
        };

        const folderUri = await vscode.window.showOpenDialog(folderOptions);

        if (!folderUri || folderUri.length === 0) {
            vscode.window.showErrorMessage('No folder selected.');
            return;
        }

        const selectedFolderPath = folderUri[0].fsPath;

        // ask user for the namespace to add to the generated classes
        const namespace = await vscode.window.showInputBox({
            prompt: 'Enter the namespace for the generated classes'
        });

        const interfaceContent = generateInterfaceClass(namespace);
        const interfaceFilePath = path.join(selectedFolderPath, `IDataItem.cs`);

        fs.writeFileSync(interfaceFilePath, interfaceContent);

        const baseClassContent = generateDataItemBaseClass(namespace);
        const baseClassFilePath = path.join(selectedFolderPath, `DataItem.cs`);

        fs.writeFileSync(baseClassFilePath, baseClassContent);

        for (const entityName in config.entities) {
            const entity = config.entities[entityName];
            let tableName = entity.source.object;

            // if table name is in the format [schema].[table], extract only the table name
            const tableNameParts = tableName.split('.');
            if (tableNameParts.length === 2) {
                tableName = tableNameParts[1];
            }
            // remove square brackets if present
            tableName = tableName.replace('[', '').replace(']', '');

            const className = entity.graphql.type.singular;

            const result = await pool.request()
                .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`);
            const columns = result.recordset;

            const classContent =  generatePocoClass(className, columns, namespace, tableName);
            const classFilePath = path.join(selectedFolderPath, `${className}.cs`);

            fs.writeFileSync(classFilePath, classContent);
        }

        vscode.window.showInformationMessage('POCO classes generated successfully.');
    } catch (err) {
        if (err instanceof Error) {
            vscode.window.showErrorMessage(`Error connecting to the database: ${err.message}`);
        } else {
            vscode.window.showErrorMessage('Error connecting to the database.');
        }
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

function generateInterfaceClass(namespace: string = ''): string {
    let classContent =  `namespace ${namespace};` + '\n\n' + `public interface IDataItem {\n`;
    classContent += `public int Id {get; set;}\n`;
    classContent += `}\n`;
    return classContent;
}

function generateDataItemBaseClass(namespace: string = ''): string {
    let classContent =  `namespace ${namespace};` + '\n\n' + `public class DataItem : IDataItem {\n`;
    classContent += `public int Id {get; set;}\n`;
    classContent += `}\n`;
    return classContent;
}

function generatePocoClass(className: string, columns: any[], namespace: string = '', tableName: string =''): string {
    let classContent = `using System.ComponentModel.DataAnnotations.Schema;\n\nnamespace ${namespace};\n\n`;
    classContent += `[Table("${tableName}")]\n`;
    classContent += `public class ${className} : DataItem {\n`;

    columns.forEach(column => {
        const propertyName = column.COLUMN_NAME;
        const propertyType = mapSqlTypeToCSharpType(column.DATA_TYPE);
        classContent += `    public ${propertyType} ${propertyName} { get; set; }\n`;
    });

    classContent += `}\n`;
    return classContent;
}

function mapSqlTypeToCSharpType(sqlType: string): string {
    switch (sqlType) {
        case 'int':
            return 'int';
        case 'varchar':
        case 'nvarchar':
        case 'text':
            return 'string';
        case 'bit':
            return 'bool';
        case 'datetime':
            return 'DateTime';
        // Add more mappings as needed
        default:
            return 'object';
    }
}

let disposable = vscode.commands.registerCommand('extension.generatePocoClasses', generatePocoClasses);

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(disposable);
}

export function deactivate() {}