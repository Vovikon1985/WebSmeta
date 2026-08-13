using System;
using System.Windows.Forms;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ExecutiveDocumentation.App;

static class Program
{
    [STAThread]
    static void Main()
    {
        var host = Host.CreateDefaultBuilder()
            .ConfigureServices((context, services) =>
            {
                // Register services here
                services.AddSingleton<Form1>();
            })
            .Build();

        ApplicationConfiguration.Initialize();
        Application.Run(host.Services.GetRequiredService<Form1>());
    }
}
