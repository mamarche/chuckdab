namespace ChuckKnowledge.Core;

public class DataItemsCollection<TItem> where TItem : IDataItem {
    public IEnumerable<TItem>? value { get; set; }
}
