
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, PawPrint, Calendar, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  {
    title: "Alle Honden",
    url: createPageUrl("AlleHonden"),
    icon: PawPrint,
  },
  {
    title: "Agenda",
    url: createPageUrl("Agenda"),
    icon: Calendar,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isGuestPage = location.pathname.startsWith('/gastpas/');

  if (isGuestPage) {
    return (
      <div className="min-h-screen" style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)'
      }}>
        <style>{`
          :root {
            --primary-blue: #1D3C87;
            --primary-pink: #F7C9D2;
            --bg-white: #FFFFFF;
            --bg-light: #F5F5F5;
          }
        `}</style>
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary-blue: #1D3C87;
          --primary-pink: #F7C9D2;
          --bg-white: #FFFFFF;
          --bg-light: #F5F5F5;
        }
        body {
          font-family: 'Poppins', 'Nunito Sans', -apple-system, sans-serif;
        }
        .kwiek-heading {
          font-family: 'Poppins', sans-serif;
          font-weight: 600;
          color: var(--primary-blue);
        }
      `}</style>
      <div className="min-h-screen flex w-full" style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)'
      }}>
        <Sidebar className="border-r-2 border-pink-100">
          <SidebarHeader className="border-b-2 border-pink-100 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden" 
                   style={{ backgroundColor: 'var(--primary-pink)' }}>
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f3c7479ea85c36ceb42b10/c4b5fd1bd_5108122c1_Favicon-Kwiekenkwispel.png"
                  alt="Kwiek & Kwispel"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div>
                <h2 className="kwiek-heading text-lg">Kwiek & Kwispel</h2>
                <p className="text-xs" style={{ color: 'var(--primary-blue)', opacity: 0.7 }}>
                  Opvolgsysteem
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`mb-2 rounded-xl transition-all duration-200 ${
                          location.pathname === item.url 
                            ? 'text-white shadow-md hover:text-pink-200' 
                            : 'hover:bg-pink-50 hover:text-blue-900'
                        }`}
                        style={{
                          backgroundColor: location.pathname === item.url ? 'var(--primary-blue)' : 'transparent'
                        }}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t-2 border-pink-100 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                     style={{ backgroundColor: 'var(--primary-blue)' }}>
                  {user?.full_name?.[0]?.toUpperCase() || 'E'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--primary-blue)' }}>
                    {user?.full_name || 'Expert'}
                  </p>
                  <p className="text-xs truncate opacity-70" style={{ color: 'var(--primary-blue)' }}>
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-pink-50 transition-all duration-200"
                style={{ color: 'var(--primary-blue)' }}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Uitloggen</span>
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/80 backdrop-blur-sm border-b-2 border-pink-100 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-pink-50 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="kwiek-heading text-xl">Kwiek & Kwispel</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
