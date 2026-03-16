--
-- PostgreSQL database dump
--

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidates (
    id integer NOT NULL,
    job_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    score integer,
    resume_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.candidates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.candidates_id_seq OWNED BY public.candidates.id;


--
-- Name: interviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.interviews (
    id integer NOT NULL,
    candidate_id integer NOT NULL,
    scheduled_at timestamp without time zone NOT NULL,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    transcript text,
    feedback text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: interviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.interviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: interviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.interviews_id_seq OWNED BY public.interviews.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    hr_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    skills text NOT NULL,
    status text DEFAULT 'OPEN'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    company text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: candidates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates ALTER COLUMN id SET DEFAULT nextval('public.candidates_id_seq'::regclass);


--
-- Name: interviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews ALTER COLUMN id SET DEFAULT nextval('public.interviews_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.candidates (id, job_id, name, email, phone, status, score, resume_url, created_at) FROM stdin;
4       2       David Lee       david@email.com +1-555-0104     HIRED   92      \N      2026-03-16 17:25:15.904256
5       2       Eve Thompson    eve@email.com   +1-555-0105     REJECTED        45      \N      2026-03-16 17:25:15.904256
6       4       Frank Wilson    frank@email.com +1-555-0106     INVITED \N      \N      2026-03-16 17:25:15.904256
7       1       Test User       test@test.com   555-1234        INVITED \N      \N      2026-03-16 17:31:55.134261
1       1       Alice Williams  alice@email.com +1-555-0101     REJECTED        59      \N      2026-03-16 17:25:15.904256
2       1       Bob Martinez    bob@email.com   +1-555-0102     HIRED   93      \N      2026-03-16 17:25:15.904256
3       1       Carol Davis     carol@email.com +1-555-0103     REJECTED        67      \N      2026-03-16 17:25:15.904256
\.


--
-- Data for Name: interviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.interviews (id, candidate_id, scheduled_at, status, attempts, transcript, feedback, created_at) FROM stdin;
3       4       2026-03-15 09:00:00     COMPLETED       1       \N      \N      2026-03-16 17:25:19.907449
4       5       2026-03-14 11:00:00     COMPLETED       2       \N      \N      2026-03-16 17:25:19.907449
5       3       2026-03-19 14:00:00     IN_PROGRESS     2       \N      \N      2026-03-16 17:38:41.894526
1       1       2026-03-20 10:00:00     COMPLETED       1       [Interview Transcript - Senior React Developer]\n\nAI: Welcome, Alice Williams. Thank you for joining us today. Let's start with a brief introduction. Can you tell me about yourself and your experience?\n\nAlice Williams: Thank you for having me. I've been working in software development for several years now...\n\nAI: Great. Let's move into the technical portion. Can you walk me through how you would design a scalable API for a high-traffic application?\n\nAlice Williams: Sure, I would start by considering the requirements and traffic patterns...\n\nAI: Interesting approach. Now let's do a coding exercise. Can you implement a function that finds the longest palindromic substring?\n\nAlice Williams: Of course. I would use dynamic programming for this...\n\nAI: Good solution. Let's discuss your experience with team collaboration. Tell me about a time you resolved a conflict with a colleague.\n\nAlice Williams: There was a situation where we had differing opinions on architecture...\n\nAI: Thank you, Alice Williams. That concludes our interview. We'll be in touch with the results soon.\n\n[End of Transcript]     Below average performance. Struggled with fundamental coding questions and had difficulty articulating technical decisions. Limited experience with the required technologies. May benefit from more preparation before reapplying.     2026-03-16 17:25:19.907449
2       2       2026-03-22 14:00:00     SCHEDULED       0       [Interview Transcript - Senior React Developer]\n\nAI: Welcome, Bob Martinez. Thank you for joining us today. Let's start with a brief introduction. Can you tell me about yourself and your experience?\n\nBob Martinez: Thank you for having me. I've been working in software development for several years now...\n\nAI: Great. Let's move into the technical portion. Can you walk me through how you would design a scalable API for a high-traffic application?\n\nBob Martinez: Sure, I would start by considering the requirements and traffic patterns...\n\nAI: Interesting approach. Now let's do a coding exercise. Can you implement a function that finds the longest palindromic substring?\n\nBob Martinez: Of course. I would use dynamic programming for this...\n\nAI: Good solution. Let's discuss your experience with team collaboration. Tell me about a time you resolved a conflict with a colleague.\n\nBob Martinez: There was a situation where we had differing opinions on architecture...\n\nAI: Thank you, Bob Martinez. That concludes our interview. We'll be in touch with the results soon.\n\n[End of Transcript] Exceptional candidate who exceeded expectations in all areas. Demonstrated deep expertise in the required tech stack with real-world examples. Excellent communication skills, asked insightful questions, and showed genuine passion for the role. Highly recommended for hire.        2026-03-16 17:25:19.907449
6       3       2026-03-17 10:00:31.781 SCHEDULED       0       [Interview Transcript - Senior React Developer]\n\nAI: Welcome, Carol Davis. Thank you for joining us today. Let's start with a brief introduction. Can you tell me about yourself and your experience?\n\nCarol Davis: Thank you for having me. I've been working in software development for several years now...\n\nAI: Great. Let's move into the technical portion. Can you walk me through how you would design a scalable API for a high-traffic application?\n\nCarol Davis: Sure, I would start by considering the requirements and traffic patterns...\n\nAI: Interesting approach. Now let's do a coding exercise. Can you implement a function that finds the longest palindromic substring?\n\nCarol Davis: Of course. I would use dynamic programming for this...\n\nAI: Good solution. Let's discuss your experience with team collaboration. Tell me about a time you resolved a conflict with a colleague.\n\nCarol Davis: There was a situation where we had differing opinions on architecture...\n\nAI: Thank you, Carol Davis. That concludes our interview. We'll be in touch with the results soon.\n\n[End of Transcript]       Candidate demonstrated strong technical knowledge and excellent problem-solving skills. Communication was clear and articulate. Showed good understanding of system design principles and was able to explain complex concepts effectively. Would be a strong addition to the team.     2026-03-16 17:39:53.724903
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jobs (id, hr_id, title, description, skills, status, created_at) FROM stdin;
1       1       Senior React Developer  We are looking for an experienced React developer to join our frontend team.    React, TypeScript, Node.js, GraphQL     OPEN    2026-03-16 17:25:11.586312
2       1       Product Manager Seeking a product manager with 5+ years of experience in SaaS products. Product Strategy, Agile, Data Analysis  OPEN    2026-03-16 17:25:11.586312
3       1       UX Designer     Looking for a creative UX designer to improve our product experience.   Figma, User Research, Prototyping       DRAFT   2026-03-16 17:25:11.586312
4       2       Backend Engineer        Build and maintain scalable backend services.   Python, PostgreSQL, AWS, Docker OPEN    2026-03-16 17:25:11.586312
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, name, company, created_at) FROM stdin;
1       sarah@acmecorp.com      Sarah Johnson   Acme Corporation        2026-03-16 17:25:07.226289
2       mike@techstart.io       Mike Chen       TechStart Inc   2026-03-16 17:25:07.226289
\.


--
-- Name: candidates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.candidates_id_seq', 7, true);


--
-- Name: interviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.interviews_id_seq', 6, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.jobs_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: interviews interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: candidates candidates_job_id_jobs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_job_id_jobs_id_fk FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: interviews interviews_candidate_id_candidates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_candidate_id_candidates_id_fk FOREIGN KEY (candidate_id) REFERENCES public.candidates(id);


--
-- Name: jobs jobs_hr_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_hr_id_users_id_fk FOREIGN KEY (hr_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--



