# chuckdab
WPC 2024 Demo project of the session "Crea API REST e GraphQL per i tuoi database in pochi minuti con Data API Builder"

## Steps to Set Up the Project from sratch

### Step 1: Create the core Class Library Project
```sh
dotnet new classlib -n  -f net8.0
```
---
### Step 2: Create the client Class Library Project
```sh
dotnet new classlib -n ChuckKnowledge.Client -f net8.0
```
---
### Step 3: Create the .NET 8 Console App Project
```sh
dotnet new console -n ChuckKnowledge.App -f net8.0
```
---
### Step 4: Add references to Core and Client class Library to the Console App
```sh
cd ChuckKnowledge.App
dotnet add reference ../ChuckKnowledge.Core
dotnet add reference ../ChuckKnowledge.Client
```
---
### Step 5: Step 4: Add references to Core class Library to the Client library
```sh
cd ChuckKnowledge.Client
dotnet add reference ../ChuckKnowledge.Core
```
---
### Step 6: Add the [dab-config.json](https://github.com/mamarche/chuckdab/blob/main/Config/dab-config.json) in Config folder
---
### Step 7: Create an Azure File Share named 'config' and upload the json file
Follow the instructions [here](https://learn.microsoft.com/en-us/azure/storage/files/storage-how-to-create-file-share?tabs=azure-portal) to create an Azure File Share.

---
### Step 8: Deploy the infrastructure using the [template.bicep](https://github.com/mamarche/chuckdab/blob/main/Infra/template.bicep) file
---
### Step 9: Use the [Dab POCO Generator](https://marketplace.visualstudio.com/items?itemName=mamarche.dab-poco-generator) extension in VSCode to generate the classes in ChuckKnowledge.Core
---
### Step 10: Add test code to the console app to get data from db
replace **'aca-wpc2024-chuck.nicerock-92961ea4.italynorth'** with your container app endpoint
```csharp
var client = new ChuckClient(
    "https://aca-wpc2024-chuck.nicerock-92961ea4.italynorth.azurecontainerapps.io/"
);
var fact = await client.GetItemAsync<Fact>(1);
Console.WriteLine(fact.FactDescription);

Console.WriteLine("Press any key to exit...");
Console.ReadKey();
```

