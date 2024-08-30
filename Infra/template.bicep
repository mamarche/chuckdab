param region string = 'italynorth'

param dataApiBuilderImage string = 'mcr.microsoft.com/azure-databases/data-api-builder:latest'
param dataApiBuilderConfigFile string = 'dab-config.json'

param containerAppName string = 'aca-wpc2024-chuck'
param storageAccountName string = 'stwpc2024chuck'
param containerappEnvironmentName string = 'cae-wpc2024-chuck'
param shareName string = 'config'
param configShareName string = 'config-share'
param configVolumeName string = 'config-volume'
param logAnalyticsWorkspaceName string = 'law-wpc2024-chuck'

param databaseConnectionString string = 'Server=tcp:chuckdata.database.windows.net,1433;Initial Catalog=chuckdata;Persist Security Info=False;User ID=marcello;Password=Wpc2024!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: logAnalyticsWorkspaceName
  location: region
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource storageAccount_resource 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: region
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    dnsEndpointType: 'Standard'
    defaultToOAuthAuthentication: false
    publicNetworkAccess: 'Enabled'
    allowCrossTenantReplication: false
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: true
    largeFileSharesState: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      virtualNetworkRules: []
      ipRules: []
      defaultAction: 'Allow'
    }
    supportsHttpsTrafficOnly: true
    encryption: {
      requireInfrastructureEncryption: false
      services: {
        file: {
          keyType: 'Account'
          enabled: true
        }
        blob: {
          keyType: 'Account'
          enabled: true
        }
      }
      keySource: 'Microsoft.Storage'
    }
    accessTier: 'Hot'
  }
}

resource fileShareService_resource 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = {
  parent: storageAccount_resource
  name: 'default'
  properties: {
    protocolSettings: {
      smb: {}
    }
    cors: {
      corsRules: []
    }
    shareDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource fileShare_resource 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  parent: fileShareService_resource
  name: shareName
  properties: {
    accessTier: 'Hot'
    shareQuota: 102400
    enabledProtocols: 'SMB'
  }
}

resource containerAppEnvironment_resource 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerappEnvironmentName
  location: region
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    zoneRedundant: false
    kedaConfiguration: {}
    daprConfiguration: {}
    customDomainConfiguration: {}
    workloadProfiles: [
      {
        workloadProfileType: 'Consumption'
        name: 'Consumption'
      }
    ]
    peerAuthentication: {
      mtls: {
        enabled: false
      }
    }
    peerTrafficConfiguration: {
      encryption: {
        enabled: false
      }
    }
  }
}

resource containerApp_resource 'Microsoft.App/containerapps@2024-03-01' = {
  name: containerAppName
  location: region
  identity: {
    type: 'None'
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment_resource.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 5000
        exposedPort: 0
        transport: 'Auto'
        traffic: [
          {
            weight: 100
            latestRevision: true
          }
        ]
        allowInsecure: true
        stickySessions: {
          affinity: 'none'
        }
      }
      maxInactiveRevisions: 100
    }
    template: {
      containers: [
        {
          image: dataApiBuilderImage
          name: containerAppName
          env: [
            {
              name: 'DATABASE_CONNECTION_STRING'
              value: databaseConnectionString
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: []
          volumeMounts: [
            {
              volumeName: configVolumeName
              mountPath: '/App/${dataApiBuilderConfigFile}'
              subPath: dataApiBuilderConfigFile
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 10
      }
      volumes: [
        {
          name: configVolumeName
          storageName: managedEnvironment_sharestorage_resource.name
          storageType: 'AzureFile'
        }
      ]
    }
  }
}

resource managedEnvironment_sharestorage_resource 'Microsoft.App/managedEnvironments/storages@2024-03-01' = {
  parent: containerAppEnvironment_resource
  name: configShareName
  properties: {
    azureFile: {
      accountName: storageAccountName
      accountKey: storageAccount_resource.listKeys().keys[0].value
      shareName: shareName
      accessMode: 'ReadOnly'
    }
  }
}



