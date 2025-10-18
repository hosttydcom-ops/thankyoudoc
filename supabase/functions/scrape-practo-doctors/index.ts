import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DoctorProfile {
  full_name: string;
  specialty: string;
  bio?: string;
  location?: string;
  photo_url?: string;
  consultation_fee?: number;
  rating?: number;
  phone?: string;
  is_verified?: boolean;
  success_rate?: string;
  timings_json?: any;
  qualifications?: string;
  certifications?: string;
  experience_years?: number;
  total_reviews?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, baseUrl, limit = 200 } = await req.json();

    if (!category) {
      throw new Error('Category is required');
    }

    console.log(`Starting scraping for category: ${category}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Construct the Practo URL for the specific category
    const practoCategoryUrl = `${baseUrl}/${category}`;
    console.log(`Scraping URL: ${practoCategoryUrl}`);

    let scrapedProfiles: DoctorProfile[] = [];
    let page = 1;
    let totalScraped = 0;

    while (totalScraped < limit && page <= 10) { // Max 10 pages as safety limit
      console.log(`Scraping page ${page}...`);
      
      try {
        const pageUrl = page === 1 ? practoCategoryUrl : `${practoCategoryUrl}?page=${page}`;
        console.log(`Fetching: ${pageUrl}`);
        
        const response = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        });

        if (!response.ok) {
          console.log(`HTTP ${response.status} for page ${page}`);
          break;
        }

        const html = await response.text();
        console.log(`Page ${page} HTML length: ${html.length}`);
        
        // Parse doctor profiles from HTML
        const profiles = await extractDoctorProfiles(html, category);
        console.log(`Extracted ${profiles.length} profiles from page ${page}`);

        if (profiles.length === 0) {
          console.log(`No more profiles found on page ${page}, stopping...`);
          break;
        }

        scrapedProfiles = scrapedProfiles.concat(profiles);
        totalScraped += profiles.length;
        
        console.log(`Total scraped so far: ${totalScraped}`);

        // Add delay to be respectful to the website
        if (page < 10 && totalScraped < limit) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

        page++;
      } catch (pageError) {
        console.error(`Error scraping page ${page}:`, pageError);
        break;
      }
    }

    console.log(`Finished scraping. Total profiles: ${scrapedProfiles.length}`);

    // Insert profiles into database
    let successCount = 0;
    let errorCount = 0;

    for (const profile of scrapedProfiles.slice(0, limit)) {
      try {
        // Check if doctor already exists
        const { data: existingDoctor } = await supabase
          .from('doctors')
          .select('id')
          .eq('full_name', profile.full_name)
          .single();

        if (!existingDoctor) {
          console.log(`Inserting doctor: ${profile.full_name}`);
          console.log(`Profile data:`, JSON.stringify(profile, null, 2));
          
          const { error } = await supabase
            .from('doctors')
            .insert(profile);

          if (error) {
            console.error(`Error inserting ${profile.full_name}:`, error);
            console.error(`Error details:`, JSON.stringify(error, null, 2));
            errorCount++;
          } else {
            console.log(`Successfully inserted ${profile.full_name}`);
            successCount++;
          }
        } else {
          console.log(`Doctor ${profile.full_name} already exists, skipping...`);
        }
      } catch (insertError) {
        console.error(`Error processing ${profile.full_name}:`, insertError);
        errorCount++;
      }
    }

    const result = {
      category,
      profilesScraped: scrapedProfiles.length,
      profilesInserted: successCount,
      errors: errorCount,
      successRate: Math.round((successCount / Math.max(scrapedProfiles.length, 1)) * 100),
      status: 'completed'
    };

    console.log('Scraping completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: 'failed'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function extractDoctorProfiles(html: string, category: string): Promise<DoctorProfile[]> {
  const profiles: DoctorProfile[] = [];

  try {
    console.log('Starting HTML parsing for real Practo data...');
    console.log('HTML content sample:', html.substring(0, 500));

    // 1) Parse JSON-LD (structured data) for Person/Physician
    const ldJsonBlocks: any[] = [];
    const ldRe = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch;
    while ((ldMatch = ldRe.exec(html)) !== null) {
      const raw = ldMatch[1]
        .replace(/\u0000/g, '')
        .replace(/&quot;/g, '"')
        .trim();
      try {
        ldJsonBlocks.push(JSON.parse(raw));
      } catch (_) {
        try {
          const fixed = raw
            .replace(/\n/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/,(\s*[}\]])/g, '$1');
          ldJsonBlocks.push(JSON.parse(fixed));
        } catch {
          console.log('Failed to parse one JSON-LD block');
        }
      }
    }

    type LdDoc = {
      ['@type']?: string | string[];
      name?: string;
      image?: string | { url?: string } | (string | { url?: string })[];
      address?: any;
      aggregateRating?: { ratingValue?: number };
      priceRange?: string;
      description?: string;
      telephone?: string;
    };

    const ldDoctors: { 
      name?: string; 
      image?: string; 
      rating?: number; 
      fee?: number; 
      location?: string; 
      bio?: string;
      phone?: string;
    }[] = [];

    const isDoctorType = (t?: string | string[]) => {
      const arr = !t ? [] : Array.isArray(t) ? t : [t];
      return arr.some((x) => /Physician|Person|Doctor/i.test(x));
    };

    const extractImage = (val: LdDoc['image']): string | undefined => {
      if (!val) return undefined;
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        for (const v of val) {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object' && (v as any).url) return (v as any).url;
        }
      }
      if (typeof val === 'object' && (val as any).url) return (val as any).url;
      return undefined;
    };

    const flatten = (obj: any): LdDoc[] => {
      const out: LdDoc[] = [];
      const stack = [obj];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur) continue;
        if (Array.isArray(cur)) stack.push(...cur);
        else if (typeof cur === 'object') {
          if (isDoctorType((cur as any)['@type'])) out.push(cur as LdDoc);
          Object.values(cur).forEach((v) => {
            if (v && typeof v === 'object') stack.push(v);
          });
        }
      }
      return out;
    };

    for (const block of ldJsonBlocks) {
      const docs = flatten(block);
      for (const d of docs) {
        const name = d.name?.trim();
        const image = extractImage(d.image);
        const rating = d.aggregateRating?.ratingValue;
        let fee: number | undefined;
        if ((d as any).priceRange !== undefined) {
          const pr = typeof (d as any).priceRange === 'string'
            ? (d as any).priceRange
            : JSON.stringify((d as any).priceRange);
          const m = pr.match(/(?:₹|INR|Rs\.?)[^0-9]*([0-9]{2,5})/i);
          if (m) fee = parseInt(m[1], 10);
        }
        let location: string | undefined;
        try {
          if (d.address) {
            if (typeof d.address === 'string') location = d.address;
            else if (typeof d.address === 'object') {
              const parts = [d.address.area, d.address.locality, d.address.addressLocality, d.address.addressRegion].filter(Boolean).join(', ');
              location = parts || undefined;
            }
          }
        } catch {}
        if (name) {
          ldDoctors.push({
            name: /^dr\.?/i.test(name) ? name : `Dr. ${name}`,
            image,
            rating: rating && rating >= 1 && rating <= 5 ? Math.round(rating * 10) / 10 : undefined,
            fee,
            location,
            bio: d.description,
            phone: d.telephone,
          });
        }
      }
    }

    // 2) Regex extraction from HTML when JSON-LD is limited
    const namePatterns = [
      // JSON-LD structured data patterns
      /"name"\s*:\s*"([^"]{3,80})"/gi,
      /"doctorDisplayName"\s*:\s*"([^"]{3,80})"/gi,
      /"fullName"\s*:\s*"([^"]{3,80})"/gi,
      /"doctorName"\s*:\s*"([^"]{3,80})"/gi,
      
      // HTML patterns with doctor-specific classes
      /<h[1-6][^>]*class="[^"]*(?:doctor|name|title)[^"]*"[^>]*>\s*([^<]{3,80})<\/h[1-6]>/gi,
      /<span[^>]*class="[^"]*(?:doctor|name|title)[^"]*"[^>]*>\s*([^<]{3,80})<\/span>/gi,
      /<div[^>]*class="[^"]*(?:doctor|name|title)[^"]*"[^>]*>\s*([^<]{3,80})<\/div>/gi,
      
      // Image alt text patterns
      /<img[^>]*alt="\s*(Dr\.?\s*[^"<]{3,80})"[^>]*>/gi,
      /<img[^>]*alt="\s*([^"<]*Dr\.?\s*[^"<]{3,80})"[^>]*>/gi,
      
      // Generic name patterns
      /<h[1-6][^>]*>\s*(Dr\.?\s*[^<]{3,80})<\/h[1-6]>/gi,
      /<span[^>]*>\s*(Dr\.?\s*[^<]{3,80})<\/span>/gi,
      
      // Card and profile patterns
      /<div[^>]*class="[^"]*(?:card|profile|doctor-card)[^"]*"[^>]*>[\s\S]*?<h[1-6][^>]*>\s*([^<]{3,80})<\/h[1-6]>[\s\S]*?<\/div>/gi,
      
      // Link patterns
      /<a[^>]*href="[^"]*doctor[^"]*"[^>]*>\s*([^<]{3,80})<\/a>/gi,
      /<a[^>]*href="\/hyderabad\/dr-[^"\s]+"[^>]*>\s*([^<]{3,80})<\/a>/gi,
    ];

    const imgPatterns = [
      // Doctor profile images with alt text containing "Dr."
      /<img[^>]*\b(?:src|data-src|data-original|data-layzr|data-lazy|srcset)="([^"]+)"[^>]*alt="[^"]*(?:Dr\.?|Doctor)[^"]*"[^>]*>/gi,
      /<img[^>]*alt="[^"]*(?:Dr\.?|Doctor)[^"]*"[^>]*\b(?:src|data-src|data-original|data-lazy|srcset)="([^"]+)"[^>]*>/gi,
      
      // JSON data patterns
      /"(?:profilePicture|doctorImage|image|avatar|photo)"\s*:\s*"(https?:[^"\s]+)"/gi,
      /"(?:image|photo|avatar)"\s*:\s*"([^"]*practo[^"]*\.(?:jpg|jpeg|png|webp))"/gi,
      
      // Common image attributes
      /<img[^>]*class="[^"]*(?:doctor|profile|avatar|user)[^"]*"[^>]*(?:src|data-src)="([^"]+)"/gi,
      /<img[^>]*(?:src|data-src)="([^"]+)"[^>]*class="[^"]*(?:doctor|profile|avatar|user)[^"]*"/gi,
      
      // Source tags
      /<source[^>]*srcset="([^"]+)"[^>]*>/gi,
      
      // Generic image patterns for doctor pages
      /<img[^>]*(?:src|data-src)="([^"]*doctor[^"]*\.(?:jpg|jpeg|png|webp))"/gi,
      /<img[^>]*(?:src|data-src)="([^"]*profile[^"]*\.(?:jpg|jpeg|png|webp))"/gi,
      /<img[^>]*(?:src|data-src)="([^"]*avatar[^"]*\.(?:jpg|jpeg|png|webp))"/gi,
    ];

    const feePatterns = [
      /(?:₹|INR|Rs\.?)[^0-9]*([0-9]{2,5})/gi,
      /"consultationFee"\s*:\s*([0-9]{2,5})/gi,
      /"fee"\s*:\s*([0-9]{2,5})/gi,
    ];

    const locationPatterns = [
      /<span[^>]*class="[^"]*(?:location|locality|area)[^"]*"[^>]*>\s*([^<]{2,50})<\/span>/gi,
      /"locality"\s*:\s*"([^"]{2,50})"/gi,
      /"clinicName"\s*:\s*"([^"]{2,80})"/gi,
    ];

    const phonePatterns = [
      // JSON data patterns
      /"(?:phone|telephone|mobile|contact|phoneNumber)"\s*:\s*"([^"]{8,15})"/gi,
      /"(?:phone|telephone|mobile|contact)"\s*:\s*"([+]?[0-9\s\-\(\)]{8,15})"/gi,
      
      // HTML tel links
      /<a[^>]*href="tel:([^"]{8,15})"[^>]*>/gi,
      /<a[^>]*href="tel:([+]?[0-9\s\-\(\)]{8,15})"[^>]*>/gi,
      
      // Text patterns
      /(?:tel|phone|mobile|contact|call)[^:]*:?\s*([+]?[0-9\s\-\(\)]{8,15})/gi,
      /(?:Phone|Mobile|Contact)[^:]*:?\s*([+]?[0-9\s\-\(\)]{8,15})/gi,
      
      // Indian phone number patterns
      /\b(\+91[\s\-]?[0-9]{10})\b/gi,
      /\b(\+91[\s\-]?[6-9][0-9]{9})\b/gi,
      /\b([6-9][0-9]{9})\b/gi,
      
      // Generic phone patterns
      /\b(\+[1-9][0-9]{1,3}[\s\-]?[0-9]{6,12})\b/gi,
      /\b([0-9]{10,15})\b/gi,
      
      // Doctor-specific patterns
      /"(?:doctorPhone|doctorContact|clinicPhone)"\s*:\s*"([^"]{8,15})"/gi,
    ];

    // Timings and verification patterns
    const timingBlockPatterns = [
      /(Mon\s*-\s*Sat|Mon\s*to\s*Sat)[^<\n]*?(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))(?:[^<\n]*?(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM)))?/gi,
      /(Sun)[^<\n]*?(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/gi,
    ];
    const verificationPattern = /(Medical\s+Registration\s+Verified)/i;
    const successRatePattern = /\b(\d{1,3}%)\b\s*\((?:\d+\s*patients?|patients)\)/i;

    // Additional patterns for qualifications, certifications, experience, reviews
    const qualificationsPatterns = [
      // Medical degree patterns
      /(?:BDS|MDS|MBBS|MD|MS|DNB|MCh|DM|PhD|Diploma|BAMS|BHMS|BUMS|BVSc|MVSc)[^<>\n]*/gi,
      /(?:Bachelor|Master|Doctorate|Diploma)[^<>\n]*(?:Medicine|Surgery|Dental|Veterinary|Ayurveda|Homeopathy|Unani)[^<>\n]*/gi,
      
      // JSON patterns
      /"qualification"\s*:\s*"([^"]+)"/gi,
      /"education"\s*:\s*"([^"]+)"/gi,
      /"degree"\s*:\s*"([^"]+)"/gi,
      /"credentials"\s*:\s*"([^"]+)"/gi,
      
      // HTML patterns
      /<span[^>]*class="[^"]*(?:qualification|education|degree)[^"]*"[^>]*>([^<]+)<\/span>/gi,
      /<div[^>]*class="[^"]*(?:qualification|education|degree)[^"]*"[^>]*>([^<]+)<\/div>/gi,
      
      // Generic patterns
      /(?:MBBS|MD|MS|DNB|MCh|DM|BDS|MDS|PhD)[^<>\n]*(?:from|in|at)[^<>\n]*/gi,
    ];

    const certificationsPatterns = [
      /"certifications"\s*:\s*"([^"]+)"/gi,
      /"awards"\s*:\s*"([^"]+)"/gi,
      /<span[^>]*class="[^"]*(?:certification|award|accredit|recognition)[^"]*"[^>]*>([^<]+)<\/span>/gi,
      /<div[^>]*class="[^"]*(?:certification|award|accredit|recognition)[^"]*"[^>]*>([^<]+)<\/div>/gi,
      /(?:Board\s+Certified|Fellowship|Gold\s+Medalist|Awarded|Accredited)[^<>\n]*/gi,
    ];

    const experiencePatterns = [
      /(\d+)\s*(?:years?|yrs?)\s*(?:experience|exp)/gi,
      /"experience"\s*:\s*(\d+)/gi,
      /"yearsOfExperience"\s*:\s*(\d+)/gi,
    ];

    const reviewsPatterns = [
      /\((\d+)\s*(?:reviews?|patients?)\)/gi,
      /"totalReviews"\s*:\s*(\d+)/gi,
      /"reviewCount"\s*:\s*(\d+)/gi,
    ];

    const namesSet = new Set<string>();
    const imagesSet = new Set<string>();
    const feesSet = new Set<number>();
    const locsSet = new Set<string>();
    const phonesSet = new Set<string>();
    const timingBlocks: string[] = [];
    let isVerified = false;
    let successRate: string | undefined;
    const qualificationsSet = new Set<string>();
    const certificationsSet = new Set<string>();
    const experienceSet = new Set<number>();
    const reviewsSet = new Set<number>();

    for (const p of namePatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        let n = (m[1] || '').toString().trim().replace(/<[^>]*>/g, '');
        if (!n) continue;
        
        // Clean the name
        n = n.replace(/[^\w\s\.\-]/g, '').replace(/\s+/g, ' ').trim();
        
        // Skip if too short or too long
        if (n.length < 3 || n.length > 80) continue;
        
        // Skip if it doesn't look like a doctor name
        if (!/Dr\.?|Doctor|^[A-Z][a-z]+ [A-Z][a-z]+/i.test(n)) continue;
        
        // Ensure it starts with Dr. if it doesn't already
        if (!/^Dr\.?\s*/i.test(n)) {
          n = `Dr. ${n}`;
        }
        
        // Clean up the name
        n = n.replace(/^Dr\.?\s*/i, 'Dr. ').trim();
        
        if (n.length >= 5 && n.length <= 80) {
          namesSet.add(n);
        }
      }
    }

    for (const p of imgPatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        const raw = (m[1] || m[2] || '').toString();
        if (!raw) continue;
        
        // Handle srcset (multiple images)
        const urls = raw.split(',').map(u => u.trim().split(' ')[0].trim());
        
        for (const firstUrl of urls) {
          if (!firstUrl) continue;
          
          let url = firstUrl.startsWith('//') ? `https:${firstUrl}` : firstUrl;
          if (!/^https?:\/\//i.test(url)) continue;
          
          // Better filtering for doctor images
          const isDoctorImage = /practo|cloudinary|cdn|doctor|providers|profile|avatar|user|headshot|portrait/i.test(url) ||
                               /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
          
          if (isDoctorImage && !/logo|icon|banner|ad|placeholder|default/i.test(url)) {
            imagesSet.add(url);
          }
        }
      }
    }

    for (const p of feePatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        const fee = parseInt(m[1], 10);
        if (fee && fee >= 100 && fee <= 5000) feesSet.add(fee);
      }
    }

    for (const p of locationPatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        const loc = (m[1] || '').toString().trim();
        if (loc && loc.length >= 2 && loc.length <= 50) locsSet.add(loc);
      }
    }

    for (const p of phonePatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        let phone = (m[1] || '').toString().trim();
        
        // Clean phone number
        phone = phone.replace(/[^\d+\-\(\)\s]/g, '').replace(/\s+/g, ' ').trim();
        
        // Skip if too short or too long
        if (!phone || phone.length < 8 || phone.length > 15) continue;
        
        // Validate phone number format
        if (/^[+]?[0-9\-\(\)\s]{8,15}$/.test(phone)) {
          // Normalize Indian numbers
          if (phone.startsWith('+91')) {
            phone = phone.replace(/[^\d]/g, '');
            if (phone.length === 12) phonesSet.add(`+${phone}`);
          } else if (phone.match(/^[6-9]\d{9}$/)) {
            phonesSet.add(`+91${phone}`);
          } else {
            phonesSet.add(phone);
          }
        }
      }
    }

    // Extract timing blocks
    for (const p of timingBlockPatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        const label = (m[1] || '').toString();
        const t1 = (m[2] || '').toString();
        const t2 = (m[3] || '').toString();
        const t3 = (m[4] || '').toString();
        const t4 = (m[5] || '').toString();
        const range1 = t1 && t2 ? `${t1} - ${t2}` : '';
        const range2 = t3 && t4 ? `${t3} - ${t4}` : '';
        const block = `${label}: ${range1}${range2 ? `, ${range2}` : ''}`.trim();
        if (block.length > 8) timingBlocks.push(block);
      }
    }
    isVerified = verificationPattern.test(html);
    const sr = successRatePattern.exec(html);
    successRate = sr ? sr[1] : undefined;

    // Extract qualifications
    for (const p of qualificationsPatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        let qual = (m[1] || m[0] || '').toString().trim();
        if (!qual) continue;
        
        // Clean the qualification
        qual = qual.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        
        // Skip if too short or too long
        if (qual.length < 3 || qual.length > 100) continue;
        
        // Skip if it doesn't look like a medical qualification
        if (!/(?:MBBS|MD|MS|DNB|MCh|DM|BDS|MDS|PhD|BAMS|BHMS|BUMS|BVSc|MVSc|Bachelor|Master|Doctorate|Diploma)/i.test(qual)) continue;
        
        // Clean up common prefixes/suffixes
        qual = qual.replace(/^(?:Dr\.?\s*|Doctor\s*)/i, '').trim();
        
        if (qual.length >= 3 && qual.length <= 100) {
          qualificationsSet.add(qual);
        }
      }
    }

    // Extract certifications
    for (const p of certificationsPatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        let cert = (m[1] || m[0] || '').toString().trim();
        if (!cert) continue;
        cert = cert.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (cert.length < 3 || cert.length > 150) continue;
        if (!/(?:Certified|Fellow|Award|Accredit|Recognition|Medalist)/i.test(cert)) continue;
        certificationsSet.add(cert);
      }
    }

    // Extract experience years
    for (const p of experiencePatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        const exp = parseInt(m[1], 10);
        if (exp && exp >= 1 && exp <= 50) {
          experienceSet.add(exp);
        }
      }
    }

    // Extract review counts
    for (const p of reviewsPatterns) {
      let m;
      while ((m = p.exec(html)) !== null) {
        const rev = parseInt(m[1], 10);
        if (rev && rev >= 0 && rev <= 10000) {
          reviewsSet.add(rev);
        }
      }
    }

    // Merge JSON-LD docs
    for (const d of ldDoctors) {
      if (d.name) namesSet.add(d.name);
      if (d.image) imagesSet.add(d.image);
      if (typeof d.fee === 'number') feesSet.add(d.fee);
      if (d.location) locsSet.add(d.location);
      if (d.phone) phonesSet.add(d.phone);
    }

    const nameArray = Array.from(namesSet);
    const imageArray = Array.from(imagesSet);
    const feeArray = Array.from(feesSet);
    const locArray = Array.from(locsSet);
    const phoneArray = Array.from(phonesSet);

    console.log(`Real data extracted: ${nameArray.length} names, ${imageArray.length} photos, ${locArray.length} locations, ${feeArray.length} fees, ${phoneArray.length} phones, timings: ${timingBlocks.length}, verified: ${isVerified}, qualifications: ${qualificationsSet.size}, experience: ${experienceSet.size}, reviews: ${reviewsSet.size}`);

    // Only create profiles if we have at least names
    if (nameArray.length === 0) {
      console.log('No doctor names found, skipping profile creation');
      return profiles;
    }

    // Create profiles with real scraped data
    const count = Math.min(nameArray.length, 200);
    for (let i = 0; i < count; i++) {
      const full_name = nameArray[i];
      if (!full_name || full_name.length < 3) continue;

      const photo_url = imageArray[i % Math.max(imageArray.length, 1)] || undefined;
      const location = locArray[i % Math.max(locArray.length, 1)] || 'Hyderabad';
      const fee = feeArray[i % Math.max(feeArray.length, 1)];
      const phone = phoneArray[i % Math.max(phoneArray.length, 1)] || undefined;

      // Build timings JSON structure
      const timingsJson = timingBlocks.length > 0 ? {
        working_hours: timingBlocks.slice(0, 3), // Store up to 3 timing blocks
        extracted_at: new Date().toISOString()
      } : null;

      // Create better bio from scraped data
      const qualifications = Array.from(qualificationsSet).slice(0, 3).join(', ');
      const certifications = Array.from(certificationsSet).slice(0, 3).join(', ');
      const experience = Array.from(experienceSet)[0];
      const reviews = Array.from(reviewsSet)[0];
      
      let bio = `Dr. ${full_name.replace(/^Dr\.?\s*/i, '')} is a ${category.replace('-', ' ')} specialist`;
      if (qualifications) {
        bio += ` with ${qualifications}`;
      }
      if (experience) {
        bio += ` and ${experience} years of experience`;
      }
      bio += ` in ${location}.`;
      if (reviews && reviews > 0) {
        bio += ` Highly rated with ${reviews} patient reviews.`;
      }
      bio += ` Committed to providing quality healthcare with personalized treatment approaches.`;

      const profile: DoctorProfile = {
        full_name,
        specialty: category.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        bio,
        location,
        photo_url,
        consultation_fee: typeof fee === 'number' ? fee : undefined,
        rating: 0,
        phone,
        is_verified: isVerified,
        success_rate: successRate,
        timings_json: timingsJson,
        qualifications: qualifications || undefined,
        certifications: certifications || undefined,
        experience_years: experience || undefined,
        total_reviews: reviews || 0,
      };
      profiles.push(profile);
    }

    console.log(`Created ${profiles.length} real doctor profiles from scraped data`);
    return profiles;
  } catch (error) {
    console.error('Error parsing HTML for real data:', error);
    // Return empty array - only real data
    return [];
  }
}