-- ROLES
CREATE TYPE public.app_role AS ENUM ('student', 'teacher');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Student',
  school TEXT,
  class_name TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'teacher'));

-- new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, school, class_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'class_name'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'teacher'
      THEN 'teacher'::public.app_role ELSE 'student'::public.app_role END
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- LESSONS
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  tips TEXT[] NOT NULL DEFAULT '{}',
  image_key TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_read" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "lessons_write" ON public.lessons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'teacher'));

-- TRAFFIC SIGNS
CREATE TABLE public.traffic_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  meaning TEXT NOT NULL,
  usage_note TEXT NOT NULL,
  glyph TEXT NOT NULL DEFAULT 'circle',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traffic_signs TO authenticated;
GRANT ALL ON public.traffic_signs TO service_role;
ALTER TABLE public.traffic_signs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signs_read" ON public.traffic_signs FOR SELECT TO authenticated USING (true);
CREATE POLICY "signs_write" ON public.traffic_signs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'teacher'));

-- QUIZ QUESTIONS
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_read" ON public.quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "questions_write" ON public.quiz_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'teacher'));

-- QUIZ ATTEMPTS
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'General',
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_select" ON public.quiz_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "attempts_insert_own" ON public.quiz_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- BADGES
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  min_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_read" ON public.badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "badges_write" ON public.badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')) WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_select" ON public.user_badges FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "user_badges_insert_own" ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SURVEY
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  awareness_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.survey_responses TO authenticated;
GRANT ALL ON public.survey_responses TO service_role;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "survey_select" ON public.survey_responses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "survey_insert_own" ON public.survey_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SEED LESSONS
INSERT INTO public.lessons (title, category, summary, content, tips, image_key, order_index) VALUES
('Pedestrian Safety', 'Pedestrian', 'Walking safely on roads, footpaths and zebra crossings.',
 'As a pedestrian you are the most vulnerable road user. Always walk on the footpath. Where there is no footpath, walk on the right side of the road so you can see oncoming traffic. Cross only at zebra crossings, pedestrian signals or foot over-bridges. Stop, look right, look left, look right again, and cross only when the road is clear.',
 ARRAY['Use the zebra crossing, never cross between parked vehicles','Wait for the green pedestrian signal','Never use your phone or headphones while crossing','Wear bright or reflective clothing at night'],
 'pedestrian', 1),
('Bicycle Safety', 'Bicycle', 'Riding your cycle safely to school and back.',
 'A bicycle is a vehicle and must follow all traffic rules. Ride in a single file on the left side of the road. Use hand signals before turning or stopping. Keep your cycle in good condition - brakes, bell and reflectors must work. Never ride two on a cycle built for one, and never hold on to a moving vehicle.',
 ARRAY['Always wear a helmet','Use a front white light and rear red reflector after dark','Signal with your hand before every turn','Never ride with headphones on'],
 'bicycle', 2),
('Two-Wheeler Safety', 'Two-Wheeler', 'Pillion rider and rider rules for scooters and motorcycles.',
 'Two-wheelers are involved in a large share of road crashes in India. Both the rider and the pillion rider must wear an ISI-marked helmet with the strap fastened. Never ride triple-seat. Stay within speed limits, avoid weaving between lanes, and never ride without a valid licence. Under-18 students must not ride motorised two-wheelers.',
 ARRAY['ISI-marked helmet for rider AND pillion','No triple riding - it is illegal and unsafe','Never use a mobile phone while riding','Keep to the left and overtake only from the right'],
 'twowheeler', 3),
('Car & School Bus Safety', 'Vehicle', 'Seat belts, safe boarding and behaviour inside vehicles.',
 'Inside a car, every passenger must wear a seat belt, including those in the rear seat. Children should sit in the back seat. In a school bus, wait for the bus to stop completely before boarding or getting down, board in a queue, stay seated during the journey, and never put your head or hands out of the window. Always get down on the footpath side.',
 ARRAY['Buckle up - front and back seats','Get in and out on the kerb side only','Stay seated while the bus is moving','Never distract the driver'],
 'bus', 4);

-- SEED SIGNS
INSERT INTO public.traffic_signs (name, category, meaning, usage_note, glyph) VALUES
('Stop', 'Mandatory', 'You must bring the vehicle to a complete stop.', 'Placed at junctions and level crossings where visibility is limited.', 'octagon'),
('Give Way', 'Mandatory', 'Slow down and give way to traffic on the main road.', 'Placed where a minor road meets a major road.', 'triangle-down'),
('No Entry', 'Mandatory', 'Vehicles are not permitted to enter beyond this point.', 'Used at the exit end of one-way streets.', 'no-entry'),
('No Parking', 'Mandatory', 'Parking is prohibited on this stretch of road.', 'Near hospitals, schools, bus stops and narrow roads.', 'circle-cross'),
('Speed Limit 40', 'Mandatory', 'Maximum permitted speed is 40 km/h.', 'School zones, markets and residential areas.', 'circle-40'),
('Horn Prohibited', 'Mandatory', 'Use of horn is not allowed here.', 'Silence zones near hospitals, schools and courts.', 'circle-horn'),
('Compulsory Turn Left', 'Mandatory', 'All vehicles must turn left ahead.', 'At junctions where straight movement is closed.', 'circle-left'),
('Pedestrian Crossing', 'Warning', 'A zebra crossing lies ahead; watch for pedestrians.', 'Before crossings near schools and markets.', 'triangle-ped'),
('School Ahead', 'Warning', 'A school is nearby; children may cross the road.', 'Placed 50-100 m before a school gate.', 'triangle-school'),
('Right Hand Curve', 'Warning', 'The road bends sharply to the right ahead.', 'On ghat roads and highway bends.', 'triangle-curve'),
('Narrow Bridge', 'Warning', 'The bridge ahead is narrower than the road.', 'Before old or single-lane bridges.', 'triangle-bridge'),
('Cattle Crossing', 'Warning', 'Animals may cross the road ahead.', 'Rural roads and highways passing villages.', 'triangle-cattle'),
('Hospital', 'Informational', 'A hospital is located nearby.', 'On approach roads to hospitals; horn use restricted.', 'square-hospital'),
('First Aid Post', 'Informational', 'First aid facility available ahead.', 'On highways and near accident-prone stretches.', 'square-firstaid'),
('Parking', 'Informational', 'Authorised parking area.', 'Near markets, offices and public buildings.', 'square-parking'),
('Pedestrian Subway', 'Informational', 'An underpass for pedestrians is available.', 'On busy roads and highways near settlements.', 'square-subway');

-- SEED QUIZ
INSERT INTO public.quiz_questions (question, options, correct_index, explanation, category) VALUES
('Where should a pedestrian cross a busy road?', ARRAY['Anywhere convenient','At a zebra crossing or pedestrian signal','Between parked cars','Behind a bus'], 1, 'Zebra crossings and pedestrian signals are the only places where drivers are legally required to give way to you.', 'Pedestrian'),
('If there is no footpath, on which side should you walk?', ARRAY['Left side, with traffic','Right side, facing oncoming traffic','Middle of the road','Either side'], 1, 'Walking facing traffic lets you see approaching vehicles and step aside in time.', 'Pedestrian'),
('What does a red pedestrian signal mean?', ARRAY['Cross quickly','Do not cross','Cross if no car is visible','Run across'], 1, 'A red pedestrian signal means you must wait on the footpath until it turns green.', 'Pedestrian'),
('What must a cyclist always wear?', ARRAY['Sunglasses','A helmet','Gloves only','Nothing special'], 1, 'A helmet reduces the risk of serious head injury by a large margin.', 'Bicycle'),
('Before turning right on a cycle you should:', ARRAY['Turn immediately','Extend your right arm to signal','Ring the bell twice','Speed up'], 1, 'A clear hand signal tells drivers behind you what you are about to do.', 'Bicycle'),
('Cyclists should ride:', ARRAY['In the middle of the road','Two abreast, chatting','In single file on the left','On the footpath'], 2, 'Single file on the left keeps you predictable and out of fast traffic.', 'Bicycle'),
('Who must wear a helmet on a two-wheeler?', ARRAY['Only the rider','Only the pillion','Both rider and pillion','Nobody on short trips'], 2, 'Indian law requires ISI-marked helmets for both the rider and the pillion rider.', 'Two-Wheeler'),
('Riding three people on a two-wheeler is:', ARRAY['Allowed for children','Illegal and unsafe','Allowed at low speed','Allowed within the city'], 1, 'Triple riding is an offence and severely affects balance and braking.', 'Two-Wheeler'),
('The minimum age for riding a geared motorcycle in India is:', ARRAY['16 years','18 years','15 years','21 years'], 1, 'A licence for a geared motorcycle can only be issued at 18 years or above.', 'Two-Wheeler'),
('Who needs to wear a seat belt in a car?', ARRAY['Only the driver','Driver and front passenger','All occupants including rear seats','Only on highways'], 2, 'Rear-seat belts are mandatory and prevent passengers from being thrown forward.', 'Vehicle'),
('When should you board a school bus?', ARRAY['While it slows down','Only after it stops completely','While running alongside','Through the window'], 1, 'Boarding a moving bus is a common cause of serious student injuries.', 'Vehicle'),
('Putting your hand out of a moving bus window is:', ARRAY['Fine if it is hot','Very dangerous','Allowed while stopped only','Allowed for signalling'], 1, 'Passing vehicles can strike your arm, causing severe injury.', 'Vehicle'),
('An inverted (upside-down) triangle sign means:', ARRAY['Stop','Give Way','No entry','Parking'], 1, 'The inverted triangle is the Give Way sign - slow down and yield.', 'Signs'),
('A red circle with a white horizontal bar means:', ARRAY['No parking','No entry','No horn','One way'], 1, 'This is the No Entry sign, used at the wrong end of one-way roads.', 'Signs'),
('Triangular signs with a red border are:', ARRAY['Mandatory signs','Warning signs','Informational signs','Advertising'], 1, 'Triangular red-bordered signs warn you about a hazard ahead.', 'Signs'),
('Blue rectangular signs usually give:', ARRAY['Warnings','Prohibitions','Information','Speed limits'], 2, 'Blue rectangular signs are informational - hospital, parking, subway and so on.', 'Signs');

-- SEED BADGES
INSERT INTO public.badges (name, description, icon, min_xp) VALUES
('Safety Starter', 'Earned your first 10 XP on SafeSteps.', 'sparkles', 10),
('Road Rookie', 'Reached 50 XP through lessons and quizzes.', 'footprints', 50),
('Signal Scholar', 'Reached 120 XP - you know your signs!', 'traffic-cone', 120),
('Safety Champion', 'Reached 250 XP of traffic safety mastery.', 'shield', 250),
('Road Safety Ambassador', 'Reached 500 XP - lead your school to safety.', 'crown', 500);
