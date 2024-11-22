using ChuckKnowledge.Client;
using ChuckKnowledge.Core;


namespace ChuckKnowledge.App
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var client = new ChuckClient(
                "https://aca-wpc2024-chuck.kindfield-7b68420d.italynorth.azurecontainerapps.io/"
            );
            
            int i=1;
            do 
            {
                var fact = await client.GetItemAsync<Fact>(i);
                Console.WriteLine(fact.FactDescription);    
                i++;
            } while (Console.ReadKey(true).Key != ConsoleKey.Escape);
        }
    }
}