using ChuckKnowledge.Client;
using ChuckKnowledge.Core;


namespace ChuckKnowledge.App
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var client = new ChuckClient(
                "https://aca-wpc2024-chuck.nicerock-92961ea4.italynorth.azurecontainerapps.io/"
            );
            var fact = await client.GetItemAsync<Fact>(1);
            Console.WriteLine(fact.FactDescription);

            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }
}