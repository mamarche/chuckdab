using System.ComponentModel.DataAnnotations.Schema;

namespace ChuckKnowledge.Core;

[Table("Categories")]
public class Category : DataItem {
    public string CategoryName { get; set; }
    public string Description { get; set; }
}
