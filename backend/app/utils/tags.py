import re


def extract_tags(text: str) -> str:
    """Extract tags in format #tag# from text"""
    if not text:
        return ""

    tags = re.findall(r'#([^#]+)#', text)
    # Remove duplicates and format back
    unique_tags = list(dict.fromkeys(tags))
    return "#" + "# #".join(unique_tags) + "#" if unique_tags else ""


def filter_by_tag(posts, tag: str):
    """Filter posts by tag"""
    return [post for post in posts if tag in post.tags] if tag else posts