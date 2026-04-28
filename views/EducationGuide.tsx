import React, { useState } from 'react';
import { BookOpen, ShieldAlert, HeartPulse, Activity, CheckCircle, XCircle, ChevronRight, Stethoscope } from 'lucide-react';

const EducationGuide: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<'rules' | 'diseases' | 'compatibility' | 'contraindications'>('rules');

  const contentImages = {
    rules: '/images/donation_rules.png',
    diseases: '/images/medical_screening.png',
    compatibility: '/images/blood_group.png',
    contraindications: '/images/contraindications.png'
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[200px] md:min-h-[250px]">
        <div className="relative z-10 w-full md:w-2/3">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3 md:mb-4 flex items-center gap-3">
            <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-red-200" />
            Knowledge Base
          </h1>
          <p className="text-red-100 text-sm md:text-lg leading-relaxed">
            Eligibility rules, disease screening, and the science of compatibility.
          </p>
        </div>
        <div className="absolute -right-20 -bottom-20 opacity-20 transform rotate-12 pointer-events-none">
          <HeartPulse className="w-64 h-64 md:w-96 md:h-96" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-8">
        
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          <button onClick={() => setActiveSegment('rules')} className={`flex-shrink-0 lg:flex-shrink w-auto lg:w-full text-left flex items-center justify-between p-3 md:p-4 rounded-xl border font-bold transition-all text-xs md:text-sm ${activeSegment === 'rules' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600'}`}>
            <span className="flex items-center gap-2 md:gap-3"><CheckCircle className="w-4 h-4 md:w-5 md:h-5" /> Eligibility</span>
            <ChevronRight className={`w-4 h-4 hidden lg:block ${activeSegment === 'rules' ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          
          <button onClick={() => setActiveSegment('contraindications')} className={`flex-shrink-0 lg:flex-shrink w-auto lg:w-full text-left flex items-center justify-between p-3 md:p-4 rounded-xl border font-bold transition-all text-xs md:text-sm ${activeSegment === 'contraindications' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600'}`}>
            <span className="flex items-center gap-2 md:gap-3"><XCircle className="w-4 h-4 md:w-5 md:h-5" /> Deferrals</span>
            <ChevronRight className={`w-4 h-4 hidden lg:block ${activeSegment === 'contraindications' ? 'opacity-100' : 'opacity-0'}`} />
          </button>
          
          <button onClick={() => setActiveSegment('diseases')} className={`flex-shrink-0 lg:flex-shrink w-auto lg:w-full text-left flex items-center justify-between p-3 md:p-4 rounded-xl border font-bold transition-all text-xs md:text-sm ${activeSegment === 'diseases' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600'}`}>
            <span className="flex items-center gap-2 md:gap-3"><ShieldAlert className="w-4 h-4 md:w-5 md:h-5" /> Screening</span>
            <ChevronRight className={`w-4 h-4 hidden lg:block ${activeSegment === 'diseases' ? 'opacity-100' : 'opacity-0'}`} />
          </button>

          <button onClick={() => setActiveSegment('compatibility')} className={`flex-shrink-0 lg:flex-shrink w-auto lg:w-full text-left flex items-center justify-between p-3 md:p-4 rounded-xl border font-bold transition-all text-xs md:text-sm ${activeSegment === 'compatibility' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-600'}`}>
            <span className="flex items-center gap-2 md:gap-3"><Activity className="w-4 h-4 md:w-5 md:h-5" /> Compatibility</span>
            <ChevronRight className={`w-4 h-4 hidden lg:block ${activeSegment === 'compatibility' ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl p-4 md:p-8 border border-gray-100 shadow-sm min-h-[400px] md:min-h-[500px]">
            
            {/* Visual Header */}
            <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden mb-6 md:mb-8 shadow-sm">
              <img src={contentImages[activeSegment]} alt="Medical illustration" className="w-full h-full object-cover object-center" />
            </div>

            {/* Content Switcher */}
            {activeSegment === 'rules' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">General Blood Donation Rules & Requirements</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" /> Basic Criteria</h3>
                    <ul className="space-y-3 text-sm text-blue-800 leading-relaxed">
                      <li>• <strong>Age:</strong> You must be between 18 and 65 years old.</li>
                      <li>• <strong>Weight:</strong> You must weigh at least 50 kg (110 lbs) to safely donate.</li>
                      <li>• <strong>Health:</strong> You must be in general good health and feeling well on the day of donation.</li>
                      <li>• <strong>Hemoglobin:</strong> Your blood iron levels must meet minimum thresholds (usually &gt;12.5 g/dL).</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
                    <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2"><Activity className="w-5 h-5 text-orange-600" /> Donation Frequency</h3>
                    <ul className="space-y-3 text-sm text-orange-800 leading-relaxed">
                      <li>• <strong>Whole Blood:</strong> Men can donate every 3 months; Women every 4 months.</li>
                      <li>• <strong>Platelets:</strong> Can be donated every 15 days, up to 24 times a year.</li>
                      <li>• <strong>Plasma:</strong> Can safely be donated every 28 days.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeSegment === 'contraindications' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Who Cannot Give Blood?</h2>
                <p className="text-gray-600 mb-6 font-medium">To protect both the donor and the recipient, certain conditions temporarily or permanently disqualify an individual from donating.</p>
                
                <div className="space-y-4">
                  <div className="flex gap-4 p-5 rounded-2xl border border-red-100 bg-red-50/30">
                    <div className="mt-1"><ShieldAlert className="w-6 h-6 text-red-500" /></div>
                    <div>
                      <h4 className="font-bold text-red-900">Permanent Disqualifications</h4>
                      <p className="text-sm text-red-700 mt-1">Individuals who have ever had bleeding disorders, certain heart conditions, Hepatitis B or C, HIV/AIDS, or severe chronic illnesses cannot donate blood to prevent disease transmission and protect their own health.</p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-5 rounded-2xl border border-orange-100 bg-orange-50/30">
                    <div className="mt-1"><Activity className="w-6 h-6 text-orange-500" /></div>
                    <div>
                      <h4 className="font-bold text-orange-900">Temporary Disqualifications (Deferrals)</h4>
                      <ul className="mt-2 space-y-2 text-sm text-orange-800">
                        <li>• <strong>Tattoos/Piercings:</strong> Wait 6 months to ensure no blood-borne infections were contracted.</li>
                        <li>• <strong>Pregnancy:</strong> Deferred during pregnancy and for 6 months after delivery.</li>
                        <li>• <strong>Antibiotics:</strong> Must finish the full course of medication before donating.</li>
                        <li>• <strong>Travel:</strong> Travel to malaria-endemic areas may require a 3-12 month deferral.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSegment === 'diseases' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Blood-Borne Diseases & Clinical Screening</h2>
                <p className="text-gray-600 mb-6">Every single unit of donated blood undergoes rigorous laboratory testing to protect patients from transfusion-transmitted infections (TTIs).</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                    <Stethoscope className="w-8 h-8 text-indigo-600 mb-3" />
                    <h4 className="font-bold text-gray-900">Mandatory Screening Tests</h4>
                    <p className="text-sm text-gray-500 mt-2">Hospitals test all blood for HIV-1 and HIV-2, Hepatitis B (HBV), Hepatitis C (HCV), Syphilis, and Malaria. Advanced nucleic acid testing (NAT) can detect viruses incredibly early.</p>
                  </div>
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow">
                    <HeartPulse className="w-8 h-8 text-pink-600 mb-3" />
                    <h4 className="font-bold text-gray-900">How Diseases Affect Donation</h4>
                    <p className="text-sm text-gray-500 mt-2">Viruses present in the bloodstream bypass the recipient's natural immune defenses when transfused. Even a microscopic viral load can severely compromise an immuno-deficient patient.</p>
                  </div>
                </div>
              </div>
            )}

            {activeSegment === 'compatibility' && (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Blood Type Compatibility Systems</h2>
                <p className="text-gray-600 mb-6">Giving someone the wrong blood type can cause a severe, potentially fatal immune reaction. Here is the universal compatibility matrix:</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm min-w-[500px]">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="p-3 md:p-4 font-bold border-b border-gray-200 w-1/3">Type</th>
                        <th className="p-3 md:p-4 font-bold border-b border-gray-200 w-1/3">Can Give To</th>
                        <th className="p-3 md:p-4 font-bold border-b border-gray-200 w-1/3">Can Receive From</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      <tr className="hover:bg-red-50 transition-colors">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">O-</td>
                        <td className="p-3 md:p-4 font-semibold text-green-700">Universal Donor</td>
                        <td className="p-3 md:p-4 text-gray-600">O- only</td>
                      </tr>
                      {/* ... other rows with similar padding ... */}
                      <tr className="hover:bg-red-50 transition-colors bg-gray-50/50">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">O+</td>
                        <td className="p-3 md:p-4 text-gray-600">O+, A+, B+, AB+</td>
                        <td className="p-3 md:p-4 text-gray-600">O+, O-</td>
                      </tr>
                      <tr className="hover:bg-red-50 transition-colors">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">A-</td>
                        <td className="p-3 md:p-4 text-gray-600">A-, A+, AB-, AB+</td>
                        <td className="p-3 md:p-4 text-gray-600">A-, O-</td>
                      </tr>
                      <tr className="hover:bg-red-50 transition-colors bg-gray-50/50">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">A+</td>
                        <td className="p-3 md:p-4 text-gray-600">A+, AB+</td>
                        <td className="p-3 md:p-4 text-gray-600">A+, A-, O+, O-</td>
                      </tr>
                      <tr className="hover:bg-red-50 transition-colors">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">B-</td>
                        <td className="p-3 md:p-4 text-gray-600">B-, B+, AB-, AB+</td>
                        <td className="p-3 md:p-4 text-gray-600">B-, O-</td>
                      </tr>
                      <tr className="hover:bg-red-50 transition-colors bg-gray-50/50">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">B+</td>
                        <td className="p-3 md:p-4 text-gray-600">B+, AB+</td>
                        <td className="p-3 md:p-4 text-gray-600">B+, B-, O+, O-</td>
                      </tr>
                      <tr className="hover:bg-red-50 transition-colors">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">AB-</td>
                        <td className="p-3 md:p-4 text-gray-600">AB-, AB+</td>
                        <td className="p-3 md:p-4 text-gray-600">AB-, A-, B-, O-</td>
                      </tr>
                      <tr className="hover:bg-red-50 transition-colors bg-gray-50/50">
                        <td className="p-3 md:p-4 font-bold text-red-600 text-base md:text-lg">AB+</td>
                        <td className="p-3 md:p-4 text-gray-600">AB+ only</td>
                        <td className="p-3 md:p-4 font-semibold text-blue-700">Universal Recipient</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default EducationGuide;
