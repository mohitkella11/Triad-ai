import { Sparkles, ArrowRight } from 'lucide-react';
import styles from './Hero.module.css';

const Hero = () => {
  return (
    <div className={styles.hero}>
      <div className={styles.heroBackground}>
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
      </div>
      
      <div className={styles.content}>
        <div className={styles.textContent}>
          <div className="badge badge-new" style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={14} /> The Ultimate Mystery Gifting Experience
          </div>
          <h1 className={`${styles.title} animate-fade-in`}>
            Send a <span className="text-gradient">Surprise Box</span> <br />
            To Someone Special
          </h1>
          <p className={`${styles.subtitle} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
            Don't know what to get them? Choose a theme and budget, and we'll curate a premium mystery box filled with unforgettable gifts. 
          </p>
          <div className={`${styles.actions} animate-fade-in`} style={{ animationDelay: '0.2s' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Surprise Me <ArrowRight size={20} />
            </button>
          </div>
        </div>
        
        <div className={`${styles.imageContent} animate-fade-in`} style={{ animationDelay: '0.3s' }}>
          <img src="/assets/hero.png" alt="Premium Surprise Box" className={styles.heroImg} />
        </div>
      </div>
    </div>
  );
};

export default Hero;
