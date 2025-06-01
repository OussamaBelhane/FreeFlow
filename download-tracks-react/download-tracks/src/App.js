import React, { useState, useEffect } from 'react';
import './modern.css';

// Download button component
function DownloadButton({ url, title, artist, fallbackUrl }) {
  const [downloading, setDownloading] = useState(false);
  
  if (!url && !fallbackUrl) {
    return (
      <span className="download-button disabled">
        <i className="fas fa-ban"></i>
        <span>Unavailable</span>
      </span>
    );
  }

  const handleDownload = (e) => {
    // Show downloading state briefly for better UX
    setDownloading(true);
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`download-button ${downloading ? 'downloading' : ''}`}
      title={`Download ${title} by ${artist}`}
      onClick={handleDownload}
    >
      {downloading ? (
        <>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Starting...</span>
        </>
      ) : (
        <>
          <i className="fas fa-download"></i>
          <span>Download</span>
        </>
      )}
    </a>
  );
}

function TrackCard({ track, index }) {
  // Prioritize file_dl_url, fallback to file_url
  const hasDlUrl = !!track.file_dl_url;
  const url = hasDlUrl ? track.file_dl_url : track.file_url;
  const fallbackUrl = !hasDlUrl && track.file_url ? track.file_url : null;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="track-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="track-number">#{index + 1}</div>
      
      {/* Image */}
      <div className="track-image-container">
        <div className="track-image">
          <img 
            src={track.track_img_url || '/static/home/assets/logo.png'} 
            alt={track.title} 
            onLoad={() => setImageLoaded(true)}
            className={imageLoaded ? 'loaded' : ''}
          />
        </div>
        
        {/* Hover overlay */}
        <div className="image-overlay">
          <div className="overlay-content">
            <DownloadButton 
              url={url}
              fallbackUrl={fallbackUrl}
              title={track.title}
              artist={track.artist_name}
            />
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="track-info">
        <h3 className="track-title">{track.title}</h3>
        <p className="track-artist">{track.artist_name}{track.artist_name2 ? `, ${track.artist_name2}` : ''}</p>
        
        {track.genre && (
          <div className="track-genres">
            <span className="track-genre">{track.genre}</span>
            {track.year && <span className="track-year">{track.year}</span>}
          </div>
        )}
      </div>
      
      {/* Button area */}
      <div className="track-actions">
        <DownloadButton 
          url={url}
          fallbackUrl={fallbackUrl}
          title={track.title}
          artist={track.artist_name}
        />
      </div>
    </div>
  );
}

function App() {
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    setTimeout(() => {
      // Manually added tracks with additional properties
      const dbTracks = [
        {
          id: 1,
          title: 'Stan',
          artist_name: 'Eminem',
          file_dl_url: 'https://www.woo55.com/adata/6713/03.%20Stan%20(www.SongsLover.com).mp3',
          track_img_url: 'https://t2.genius.com/unsafe/340x340/https%3A%2F%2Fimages.genius.com%2F45656143acb76cff7f5a1269328a7268.600x600x1.png',
          genre: 'Hip-Hop',
          year: 2000
        },
        {
          id: 2,
          title: 'Creepin\'',
          artist_name: 'DTMF Luther',
          file_dl_url: 'https://share33.com/2022/Metro%20Boomin%20-%20HEROES%20&%20VILLAINS%20-%20(SongsLover.com)/10%20Creepin%20-%20(SongsLover.com).mp3',
          track_img_url: 'https://images.genius.com/f3d1d78ded7a82fe8bc7ec6441eb9018.1000x996x1.jpg',
          genre: 'R&B',
          year: 2022
        },
        {
          id: 3,
          title: 'DTMF',
          artist_name: 'DTMF Luther',
          file_dl_url: 'https://manyuploading.com/music/Bad%20Bunny%20-%20DeBi%20TiRAR%20MaS%20FOToS%20Album%20-%202025%20-%20(SongsLover.com)/16.%20DtMF%20-%20(SongsLover.com).mp3',
          track_img_url: 'https://charts-static.billboard.com/img/2025/01/bad-bunny-6eh-debitirarmasfotos-6xg-344x344.jpg',
          genre: 'Reggaeton',
          year: 2025
        },
        {
          id: 4,
          title: 'Blinding Lights',
          artist_name: 'The Weeknd',
          file_dl_url: 'https://z3.fm/download/25829629',
          track_img_url: 'https://upload.wikimedia.org/wikipedia/en/e/e6/The_Weeknd_-_Blinding_Lights.png',
          genre: 'Pop',
          year: 2020
        },
        {
          id: 5,
          title: 'Lovely',
          artist_name: 'Billie Eilish, Khalid',
          file_dl_url: 'https://z3.fm/download/27381848',
          track_img_url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fvignette.wikia.nocookie.net%2Fwherearetheavocados%2Fimages%2Fe%2Fe5%2FLovely_-_Single.jpg%2Frevision%2Flatest%3Fcb%3D20180419182526&f=1&nofb=1&ipt=6c4b55fa487cd8b0437f8ab6bcf389947ca6726579c984437c5dc4eb3d20fd8a',
          genre: 'Pop',
          year: 1972
        },
        {
          id: 6,
          title: 'Beautiful Things',
          artist_name: 'Benson Boone',
          file_dl_url: 'https://z3.fm/download/40672721',
          track_img_url: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Ftse2.mm.bing.net%2Fth%3Fid%3DOIP.bo9DlohGfYKQaMqdUx-ysgAAAA%26cb%3Diwc2%26pid%3DApi&f=1&ipt=2aed494bb91c7f795b3741b65801804a0955c32d0ebc11bcd5ee5de6342752a3',
          genre: 'Rock',
          year: 2004
        }
      ];
      
      setTracks(dbTracks);
      setIsLoading(false);
    }, 1000);
  }, []);

  const filteredTracks = tracks.filter(t => 
    (t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.artist_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          {/* Logo and title */}
          <h1>
            <i className="fas fa-music"></i>
            Music Downloads
          </h1>
          
          {/* Search box */}
          <div className="search-container">
            <i className="fas fa-search search-icon"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search tracks or artists..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main>
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading tracks...</p>
          </div>
        ) : filteredTracks.length > 0 ? (
          <div className="tracks-grid">
            {filteredTracks.map((track, index) => (
              <TrackCard key={track.id} track={track} index={index} />
            ))}
          </div>
        ) : (
          <div className="no-results">
            <i className="fas fa-search"></i>
            <h2>No tracks found</h2>
            <p>Try adjusting your search query</p>
            {search && (
              <button className="clear-search-button" onClick={() => setSearch('')}>
                Clear Search
              </button>
            )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Music App</p>
      </footer>
    </div>
  );
}

export default App;
