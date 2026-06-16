import os
import re
import urllib.request
import time
from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Cache configuration
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 600  # 10 minutes
_cache = {
    "data": None,
    "last_updated": 0
}

def clean_html_tags(html_text):
    """Remove HTML tags and clean up whitespace for Twitter formatting."""
    # Replace anchor tags with their text and URL in parentheses if it's external,
    # or just clean it up.
    # e.g., <a href="http://example.com">link</a> -> link (http://example.com)
    text = html_text
    
    # Extract links and format them
    text = re.sub(r'<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)</a>', r'\2 (\1)', text)
    
    # Strip other tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Unescape HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    
    # Normalize whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_xml_feed(xml_data):
    """
    Parse the Atom XML feed using xml.etree.ElementTree.
    Returns a structured list of entries.
    """
    import xml.etree.ElementTree as ET
    
    # Handle namespaces
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    try:
        # Standard ElementTree parsing
        # Atom feed could have an encoding declaration, but it should be bytes when parsing.
        root = ET.fromstring(xml_data)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []
        
    entries = []
    
    for entry in root.findall('atom:entry', namespaces):
        title_elem = entry.find('atom:title', namespaces)
        updated_elem = entry.find('atom:updated', namespaces)
        id_elem = entry.find('atom:id', namespaces)
        link_elem = entry.find('atom:link[@rel="alternate"]', namespaces)
        if link_elem is None:
            link_elem = entry.find('atom:link', namespaces)
            
        content_elem = entry.find('atom:content', namespaces)
        
        title = title_elem.text if title_elem is not None else "Unknown Date"
        updated = updated_elem.text if updated_elem is not None else ""
        entry_id = id_elem.text if id_elem is not None else ""
        link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split content_html by <h3> tags
        updates = []
        if content_html:
            # We split by <h3>(.*?)</h3>
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            
            # The first item in parts is the text before the first <h3> (usually empty or description)
            # Subsequent items come in pairs: type, description
            for i in range(1, len(parts), 2):
                update_type = parts[i].strip()
                update_body = parts[i+1].strip() if i+1 < len(parts) else ""
                
                # Format a plain text summary for Twitter
                plain_text = clean_html_tags(update_body)
                
                updates.append({
                    "type": update_type,
                    "html": update_body,
                    "text": plain_text
                })
        
        # If no updates were parsed but there is content, add it as a general update
        if not updates and content_html:
            updates.append({
                "type": "Update",
                "html": content_html,
                "text": clean_html_tags(content_html)
            })
            
        entries.append({
            "id": entry_id,
            "date": title,  # Typically Google Cloud release notes use the date as the entry title
            "updated": updated,
            "link": link,
            "updates": updates
        })
        
    return entries

def fetch_and_parse_feed():
    """Fetch the feed from URL and parse it."""
    # Check cache first
    now = time.time()
    if _cache["data"] and (now - _cache["last_updated"] < CACHE_DURATION):
        print("Returning cached feed data")
        return _cache["data"], True
        
    try:
        print(f"Fetching feed from {FEED_URL}...")
        # Set a header to look like a browser if needed
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        # Parse it
        parsed_entries = parse_xml_feed(xml_data)
        
        if parsed_entries:
            _cache["data"] = parsed_entries
            _cache["last_updated"] = now
            return parsed_entries, False
            
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # If we have stale cache, return it rather than failing completely
        if _cache["data"]:
            print("Returning stale cached data due to fetch error")
            return _cache["data"], True
            
    return None, False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    entries, cached = fetch_and_parse_feed()
    if entries is None:
        return jsonify({"error": "Failed to fetch release notes from Google Cloud feed."}), 500
    return jsonify({
        "entries": entries,
        "cached": cached,
        "timestamp": time.time()
    })

if __name__ == '__main__':
    # Run server on port 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
