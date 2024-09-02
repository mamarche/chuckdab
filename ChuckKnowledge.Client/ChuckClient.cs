
using System.ComponentModel.DataAnnotations.Schema;
using System.Reflection;
using System.Text.Json;
using ChuckKnowledge.Core;

namespace ChuckKnowledge.Client;

public class ChuckClient
{
    private string _dabEndpoint;

    public ChuckClient(string endpoint)
    {
        _dabEndpoint = endpoint;
        if (!_dabEndpoint.EndsWith("/"))
        {
            _dabEndpoint += "/";
        }
        _dabEndpoint += "api";
    }

    public async Task<string> GetRandomJoke()
    {
        using (var _httpClient = new HttpClient())
        {
            var response = await _httpClient.GetAsync("https://api.chucknorris.io/jokes/random");
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            
            return content;
        }
        
    }

    public async Task<TItem?> GetItemAsync<TItem>(int id) where TItem : DataItem
    {
        using (var _httpClient = new HttpClient())
        {
            string entityName = GetTableName<TItem>();
            var url = $"{_dabEndpoint}/{entityName}/Id/{id}";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();

            var dataItems = JsonSerializer.Deserialize<DataItemsCollection<TItem>>(content);

            return dataItems.value?.FirstOrDefault();
        }
    }

    public string GetTableName<TItem>()
        {
            var tableAttribute = typeof(TItem).GetCustomAttribute<TableAttribute>();
            if (tableAttribute != null)
            {
                return tableAttribute.Name;
            }
            else
            {
                throw new InvalidOperationException($"The type {typeof(TItem).Name} does not have a Table attribute.");
            }
        }
}
