using System.ComponentModel.DataAnnotations.Schema;

namespace ChuckKnowledge.Core;

[Table("UserComments")]
public class UserComment : DataItem {
    public int UserID { get; set; }
    public string CommentText { get; set; }
    public object Rating { get; set; }
    public DateTime DateCommented { get; set; }
}
