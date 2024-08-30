using System;
using System.Threading.Tasks;
using System.Text.Json;
using ChuckKnowledge.Client;

namespace ChuckKnowledge.App
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var client = new ChuckClient();
            var joke = await client.GetRandomJoke();
            Console.WriteLine(joke);

            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }
}