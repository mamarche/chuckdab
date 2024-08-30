namespace ChuckKnowledge.Client;

public class ChuckClient
{
    
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
}
