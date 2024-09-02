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
        showError('No file selected.');
        return;
    }

    const configFilePath = fileUri[0].fsPath;
    if (!fs.existsSync(configFilePath)) {
        showError('dab-config.json not found.');
        return;
    }

    const configContent = fs.readFileSync(configFilePath, 'utf-8');
    const config = JSON.parse(configContent);

    if (!config.entities) {
        showError('No entities found in dab-config.json.');
        return;
    }

    const connectionString = await vscode.window.showInputBox({
        prompt: 'Enter the database connection string'
    });

    if (!connectionString) {
        showError('No connection string provided.');
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
            showError('No folder selected.');
            return;
        }

        const selectedFolderPath = folderUri[0].fsPath;

        const namespace = await vscode.window.showInputBox({
            prompt: 'Enter the namespace for the generated classes'
        });

        await writeClassFile(selectedFolderPath, 'IDataItem.cs', generateClassContent('interface', namespace));
        await writeClassFile(selectedFolderPath, 'DataItem.cs', generateClassContent('base', namespace));
        await writeClassFile(selectedFolderPath, 'DataItemsCollection.cs', generateClassContent('collection', namespace));

        for (const entityName in config.entities) {
            const entity = config.entities[entityName];
            let tableName = entity.source.object.split('.').pop().replace('[', '').replace(']', '');
            const className = entity.graphql.type.singular;

            const result = await pool.request()
                .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${tableName}'`);
            const columns = result.recordset;

            const classContent = generatePocoClass(className, columns, namespace, tableName);
            await writeClassFile(selectedFolderPath, `${className}.cs`, classContent);
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

function showError(message: string) {
    vscode.window.showErrorMessage(message);
}

function generateClassContent(type: 'interface' | 'base' | 'collection', namespace: string = ''): string {
    let classContent = `namespace ${namespace};\n\n`;
    switch (type) {
        case 'interface':
            classContent += `public interface IDataItem {\n    public int Id { get; set; }\n}\n`;
            break;
        case 'base':
            classContent += `public class DataItem : IDataItem {\n    public int Id { get; set; }\n}\n`;
            break;
        case 'collection':
            classContent += `public class DataItemsCollection<TItem> where TItem : IDataItem {\n    public IEnumerable<TItem>? value { get; set; }\n}\n`;
            break;
    }
    return classContent;
}

function generatePocoClass(className: string, columns: any[], namespace: string = '', tableName: string = ''): string {
    let classContent = `using System.ComponentModel.DataAnnotations.Schema;\n\nnamespace ${namespace};\n\n`;
    classContent += `[Table("${sanitizeInput(tableName)}")]\n`;
    classContent += `public class ${className} : DataItem {\n`;

    columns.forEach(column => {
        //don't generate property for Id column because it's already in the base class
        if (column.COLUMN_NAME === 'Id') {
            return;
        }
        const propertyName = column.COLUMN_NAME;
        const propertyType = mapSqlTypeToCSharpType(column.DATA_TYPE);
        classContent += `    public ${propertyType} ${propertyName} { get; set; }\n`;
    });

    classContent += `}\n`;
    return classContent;
}

function sanitizeInput(input: string): string {
    return input.replace(/[\[\]']/g, '');
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
        default:
            return 'object';
    }
}

async function writeClassFile(folderPath: string, fileName: string, content: string) {
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, content);
}

let disposable = vscode.commands.registerCommand('extension.generatePocoClasses', generatePocoClasses);

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(disposable);
}

export function deactivate() { }