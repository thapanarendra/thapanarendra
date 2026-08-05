document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                // Account for fixed header
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for fade-in animations with stagger
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Staggered animation for children if it's a grid
                if (entry.target.classList.contains('stagger-container')) {
                    const children = entry.target.children;
                    Array.from(children).forEach((child, index) => {
                        setTimeout(() => {
                            child.classList.add('visible');
                        }, index * 100); // 100ms delay between each item
                    });
                }

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(element => {
        observer.observe(element);
    });

    // Observe timeline items for scroll animation
    document.querySelectorAll('.timeline-item').forEach(element => {
        observer.observe(element);
    });

    // Typing Animation
    const typeText = (element, text, speed = 100) => {
        let i = 0;
        element.innerHTML = '';
        const type = () => {
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        };
        type();
    };

    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        const originalText = heroSubtitle.innerText;
        typeText(heroSubtitle, originalText, 50);
    }

    // Scroll Spy (Active Nav Link)
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (section.getAttribute('id') && pageYOffset >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        // Only update active class if we are on the homepage or a page with scrollable sections
        // and we actually found a current section.
        if (current) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                // Only match hash links or links that exactly match the current section ID
                if (link.getAttribute('href').includes('#' + current)) {
                    link.classList.add('active');
                }
            });
        }
    });

    // 3D Tilt Effect for Cards (updated for timeline blocks)
    const cards = document.querySelectorAll('.timeline-content, .achievement-card, .cert-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });

    // Accordion Toggle for Experience Details
    const toggleButtons = document.querySelectorAll('.toggle-details, .exp-toggle-btn');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function () {
            const detailsDiv = this.nextElementSibling;
            const toggleText = this.querySelector('.toggle-text, span');

            // Toggle active class for icon rotation
            this.classList.toggle('active');

            // Toggle visibility
            if (detailsDiv.style.display === 'none' || !detailsDiv.style.display) {
                detailsDiv.style.display = 'block';
                if (toggleText) toggleText.textContent = 'Hide Key Achievements';
                // Smooth expand animation
                setTimeout(() => {
                    detailsDiv.style.opacity = '1';
                }, 10);
            } else {
                detailsDiv.style.opacity = '0';
                setTimeout(() => {
                    detailsDiv.style.display = 'none';
                }, 300);
                if (toggleText) toggleText.textContent = 'View Key Achievements';
            }
        });
    });

    // Back to Top Button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopBtn.className = 'back-to-top';
    document.body.appendChild(backToTopBtn);

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });


    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(10, 10, 10, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
        } else {
            navbar.style.background = 'rgba(10, 10, 10, 0.8)';
            navbar.style.boxShadow = 'none';
        }
    });

    // Timeline Earth Animation
    const timeline = document.querySelector('.timeline');
    const earth = document.querySelector('.timeline-earth');

    if (timeline && earth) {
        window.addEventListener('scroll', () => {
            const rect = timeline.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const timelineHeight = rect.height;

            // Calculate scroll progress relative to the timeline container
            // We want the earth to track the center of the viewport
            const scrollPosition = window.scrollY + (windowHeight / 2);
            const timelineTop = rect.top + window.scrollY;

            let percentage = (scrollPosition - timelineTop) / timelineHeight;

            // Clamp percentage between 0 and 1 (start to end of timeline)
            percentage = Math.max(0, Math.min(1, percentage));

            // Update earth position
            earth.style.top = (percentage * 100) + '%';
        });
    }

    // Mobile Navigation Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navRight = document.querySelector('.nav-right');
    const body = document.body;

    if (mobileMenuToggle && navRight) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navRight.classList.toggle('mobile-active');
            mobileMenuToggle.classList.toggle('active');
            body.classList.toggle('menu-open');

            // Update icon
            const icon = mobileMenuToggle.querySelector('i');
            if (navRight.classList.contains('mobile-active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });

        // Close menu when clicking nav link
        const mobileNavLinks = navRight.querySelectorAll('.nav-link');
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                navRight.classList.remove('mobile-active');
                mobileMenuToggle.classList.remove('active');
                body.classList.remove('menu-open');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navRight.classList.contains('mobile-active') && 
                !navRight.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                navRight.classList.remove('mobile-active');
                mobileMenuToggle.classList.remove('active');
                body.classList.remove('menu-open');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
});
