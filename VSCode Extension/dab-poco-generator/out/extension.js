"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const sql = __importStar(require("mssql"));
async function generatePocoClasses() {
    const options = {
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
    let pool = null;
    try {
        pool = await sql.connect(connectionString);
        const folderOptions = {
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
    }
    catch (err) {
        if (err instanceof Error) {
            vscode.window.showErrorMessage(`Error connecting to the database: ${err.message}`);
        }
        else {
            vscode.window.showErrorMessage('Error connecting to the database.');
        }
    }
    finally {
        if (pool) {
            await pool.close();
        }
    }
}
function showError(message) {
    vscode.window.showErrorMessage(message);
}
function generateClassContent(type, namespace = '') {
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
function generatePocoClass(className, columns, namespace = '', tableName = '') {
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
function sanitizeInput(input) {
    return input.replace(/[\[\]']/g, '');
}
function mapSqlTypeToCSharpType(sqlType) {
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
async function writeClassFile(folderPath, fileName, content) {
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, content);
}
let disposable = vscode.commands.registerCommand('extension.generatePocoClasses', generatePocoClasses);
function activate(context) {
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map