class ImageCache {
  private cache = new Map<string, string>();
  private loadingPromises = new Map<string, Promise<string>>();
  private maxCacheSize = 100; 
  private cacheOrder: string[] = []; 

  async getImage(url: string): Promise<string> {
    if (this.cache.has(url)) {
      
      this.updateCacheOrder(url);
      return this.cache.get(url)!;
    }
    if (this.loadingPromises.has(url)) return this.loadingPromises.get(url)!;

    const loadingPromise = this.loadImage(url);
    this.loadingPromises.set(url, loadingPromise);

    try {
      const result = await loadingPromise;
      this.addToCache(url, result);
      return result;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  private async loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(url);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  private addToCache(url: string, result: string): void {
    
    while (this.cacheOrder.length >= this.maxCacheSize) {
      const oldest = this.cacheOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
    
    this.cache.set(url, result);
    this.cacheOrder.push(url);
  }

  private updateCacheOrder(url: string): void {
    const index = this.cacheOrder.indexOf(url);
    if (index > -1) {
      this.cacheOrder.splice(index, 1);
      this.cacheOrder.push(url);
    }
  }

  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
    this.cacheOrder = [];
  }

  remove(url: string): void {
    this.cache.delete(url);
    this.loadingPromises.delete(url);
    const index = this.cacheOrder.indexOf(url);
    if (index > -1) {
      this.cacheOrder.splice(index, 1);
    }
  }

  clearStudent(studentId: number): void {
    const studentUrls = Array.from(this.cache.keys()).filter(url => 
      url.includes(`/student/${studentId}`)
    );
    studentUrls.forEach(url => this.remove(url));
  }

  size(): number {
    return this.cache.size;
  }

  
  preloadImages(urls: string[]): void {
    urls.forEach(url => {
      if (!this.cache.has(url) && !this.loadingPromises.has(url)) {
        this.getImage(url).catch(() => {}); 
      }
    });
  }
}

export const imageCache = new ImageCache();