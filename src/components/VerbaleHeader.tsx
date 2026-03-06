export default function VerbaleHeader() {
    return (
        <div className="mb-6 font-serif text-[11px] leading-tight">
            {/* Top Multi-color Banner */}
            <div className="w-full h-[12px] flex mb-1">
                <div className="h-full bg-[#45387E]" style={{ width: '60%', clipPath: 'polygon(0 0, 100% 0, 95% 100%, 0% 100%)' }}></div>
                <div className="h-full bg-[#F4B400] -ml-[2%] flex-1"></div>
            </div>

            {/* Official AGESCI Header */}
            <div className="flex justify-between items-start py-2 border-b-[1.5px] border-[#45387E] min-h-[90px] gap-2">
                <div className="flex-shrink-0">
                    {/* Official AGESCI Logo (Giglio) */}
                    <img 
                        src="/turi_1_no_bg.png" 
                        alt="AGESCI" 
                        className="w-[50px] md:w-[70px] h-auto"
                    />
                </div>

                <div className="text-right text-[#45387E] mt-1 overflow-hidden">
                    <div className="font-bold text-[12px] md:text-[14px] font-serif truncate">Gruppo Turi 1</div>
                    <div className="font-bold text-[9px] md:text-[11px] leading-tight">Associazione Guide e Scouts Cattolici Italiani</div>
                    <div className="text-[8px] md:text-[10px] mt-1 italic leading-tight">
                        Strada Mola 4 – 70010 Turi BA <br className="md:hidden" />
                        <span className="underline decoration-1">turi1@puglia.agesci.it</span> <br />
                        Codice fiscale: 91120250724 <br className="md:hidden" />
                        N. Iscr. R.U.N.T.S.: 64984
                    </div>
                </div>
            </div>

            {/* WAGGGS / WOSM Details */}
            <div className="flex items-center gap-3 py-2 border-b border-gray-100 opacity-60">
                <div className="flex gap-1.5 grayscale">
                    <div className="w-5 h-5 rounded-full bg-[#45387E]/20 flex items-center justify-center text-[7px] font-black text-[#45387E] border border-[#45387E]/30">W</div>
                    <div className="w-5 h-5 rounded-full bg-[#45387E]/20 flex items-center justify-center text-[7px] font-black text-[#45387E] border border-[#45387E]/30">M</div>
                </div>
                <div className="text-[8px] text-gray-500 font-serif leading-[1.3]">
                    WAGGGS / WOSM Member • Iscritta al Registro Nazionale delle Associazioni di Promozione Sociale n.72 - Legge 383/2000
                </div>
            </div>
        </div>
    );
}
