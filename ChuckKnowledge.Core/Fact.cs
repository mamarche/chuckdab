using System.ComponentModel.DataAnnotations.Schema;

namespace ChuckKnowledge.Core;

[Table("Facts")]
public class Fact : DataItem {
    public int Id { get; set; }
    public string FactDescription { get; set; }
    public bool IsVerified { get; set; }
    public DateTime DateAdded { get; set; }
    public int CategoryID { get; set; }
}
